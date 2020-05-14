import {iterateShadowNodes} from '../utils/dom';
import {forEach, push} from '../../utils/array';
import {isDefinedSelectorSupported} from '../../utils/platform';
import {shouldManageStyle, STYLE_SELECTOR} from './style-manager';

let observer: MutationObserver = null;

interface ChangedStyles {
    created: (HTMLStyleElement | HTMLLinkElement)[];
    updated: (HTMLStyleElement | HTMLLinkElement)[];
    removed: (HTMLStyleElement | HTMLLinkElement)[];
    moved: (HTMLStyleElement | HTMLLinkElement)[];
}

function getAllManageableStyles(nodes: Iterable<Node> | ArrayLike<Node>) {
    const results: (HTMLLinkElement | HTMLStyleElement)[] = [];
    forEach(nodes, (node) => {
        if (node instanceof Element) {
            if (shouldManageStyle(node)) {
                results.push(node as HTMLLinkElement | HTMLStyleElement);
            }
        }
        if (node instanceof Element || node instanceof ShadowRoot) {
            node.querySelectorAll(STYLE_SELECTOR)
                .forEach((style: HTMLLinkElement | HTMLStyleElement) => {
                    if (shouldManageStyle(style)) {
                        results.push(style);
                    }
                });
        }
    });
    return results;
}

const undefinedGroups = new Map<string, Set<Element>>();
let elementsDefinitionCallback: (elements: Element[]) => void;

function collectUndefinedElements(root: ParentNode) {
    if (!isDefinedSelectorSupported()) {
        return;
    }
    root.querySelectorAll(':not(:defined)')
        .forEach((el) => {
            const tag = el.tagName.toLowerCase();
            if (!undefinedGroups.has(tag)) {
                undefinedGroups.set(tag, new Set());
                customElementsWhenDefined(tag).then(() => {
                    if (elementsDefinitionCallback) {
                        const elements = undefinedGroups.get(tag);
                        undefinedGroups.delete(tag);
                        elementsDefinitionCallback(Array.from(elements));
                    }
                });
            }
            undefinedGroups.get(tag).add(el);
        });
}

function customElementsWhenDefined(tag: string) {
    return new Promise((resolve) => {
        // `customElements.whenDefined` is not available in extensions
        // https://bugs.chromium.org/p/chromium/issues/detail?id=390807
        if (window.customElements && typeof window.customElements.whenDefined === 'function') {
            customElements.whenDefined(tag).then(resolve);
        } else {
            const checkIfDefined = () => {
                const elements = undefinedGroups.get(tag);
                if (elements && elements.size > 0) {
                    if (elements.values().next().value.matches(':defined')) {
                        resolve();
                    } else {
                        requestAnimationFrame(checkIfDefined);
                    }
                }
            };
            requestAnimationFrame(checkIfDefined);
        }
    });
}

function watchWhenCustomElementsDefined(callback: (elements: Element[]) => void) {
    elementsDefinitionCallback = callback;
}

function unsubscribeFromDefineCustomElements() {
    elementsDefinitionCallback = null;
    undefinedGroups.clear();
}

const shadowObservers = new Set<MutationObserver>();
let nodesShadowObservers = new WeakMap<Node, MutationObserver>();

function unsubscribeFromShadowRootChanges() {
    shadowObservers.forEach((o) => o.disconnect());
    shadowObservers.clear();
    nodesShadowObservers = new WeakMap();
}

export function watchForStyleChanges(update: (styles: ChangedStyles) => void) {
    if (observer) {
        observer.disconnect();
        shadowObservers.forEach((o) => o.disconnect());
        shadowObservers.clear();
        nodesShadowObservers = new WeakMap();
    }

    function handleMutations(mutations: MutationRecord[]) {
        const createdStyles = new Set<HTMLLinkElement | HTMLStyleElement>();
        const updatedStyles = new Set<HTMLLinkElement | HTMLStyleElement>();
        const removedStyles = new Set<HTMLLinkElement | HTMLStyleElement>();
        const movedStyles = new Set<HTMLLinkElement | HTMLStyleElement>();

        const additions = new Set<Node>();
        const deletions = new Set<Node>();
        const styleUpdates = new Set<HTMLLinkElement | HTMLStyleElement>();
        mutations.forEach((m) => {
            m.addedNodes.forEach((n) => additions.add(n));
            m.removedNodes.forEach((n) => deletions.add(n));
            if (m.type === 'attributes' && shouldManageStyle(m.target)) {
                styleUpdates.add(m.target as HTMLLinkElement | HTMLStyleElement);
            }
        });
        const styleAdditions = getAllManageableStyles(additions);
        const styleDeletions = getAllManageableStyles(deletions);
        additions.forEach((n) => {
            iterateShadowNodes(n, (host) => {
                const shadowStyles = getAllManageableStyles(host.shadowRoot.children);
                if (shadowStyles.length > 0) {
                    push(styleAdditions, shadowStyles);
                }
            });
        });
        deletions.forEach((n) => {
            iterateShadowNodes(n, (host) => {
                const shadowStyles = getAllManageableStyles(host.shadowRoot.children);
                if (shadowStyles.length > 0) {
                    push(styleDeletions, shadowStyles);
                }
            });
        });

        styleDeletions.forEach((style) => {
            if (style.isConnected) {
                movedStyles.add(style);
            } else {
                removedStyles.add(style);
            }
        });
        styleUpdates.forEach((style) => {
            if (!removedStyles.has(style)) {
                updatedStyles.add(style);
            }
        });
        styleAdditions.forEach((style) => {
            if (!(removedStyles.has(style) || movedStyles.has(style) || updatedStyles.has(style))) {
                createdStyles.add(style);
            }
        });

        if (createdStyles.size + removedStyles.size + updatedStyles.size > 0) {
            update({
                created: Array.from(createdStyles),
                updated: Array.from(updatedStyles),
                removed: Array.from(removedStyles),
                moved: Array.from(movedStyles),
            });
        }

        additions.forEach((n) => {
            if (n.isConnected) {
                iterateShadowNodes(n, subscribeForShadowRootChanges);
                if (n instanceof Element) {
                    collectUndefinedElements(n);
                }
            }
        });
    }

    function subscribeForShadowRootChanges(node: Element) {
        if (nodesShadowObservers.has(node) || node.shadowRoot == null) {
            return;
        }
        const shadowObserver = new MutationObserver(handleMutations);
        shadowObserver.observe(node.shadowRoot, mutationObserverOptions);
        shadowObservers.add(shadowObserver);
        nodesShadowObservers.set(node, shadowObserver);
    }

    const mutationObserverOptions = {childList: true, subtree: true, attributes: true, attributeFilter: ['rel', 'disabled']};
    observer = new MutationObserver(handleMutations);
    observer.observe(document.documentElement, mutationObserverOptions);
    iterateShadowNodes(document.documentElement, subscribeForShadowRootChanges);

    watchWhenCustomElementsDefined((hosts) => {
        const newStyles = getAllManageableStyles(hosts.map((h) => h.shadowRoot));
        update({created: newStyles, updated: [], removed: [], moved: []});
        hosts.forEach((h) => subscribeForShadowRootChanges(h));
    });
    collectUndefinedElements(document);
}

export function stopWatchingForStyleChanges() {
    if (observer) {
        observer.disconnect();
        observer = null;
        unsubscribeFromShadowRootChanges();
        unsubscribeFromDefineCustomElements();
    }
}
