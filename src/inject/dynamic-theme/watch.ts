import {iterateShadowNodes} from '../utils/dom';
import {forEach, push} from '../../utils/array';
import {isDefinedSelectorSupported} from '../../utils/platform';
import {shouldManageStyle, STYLE_SELECTOR} from './style-manager';

const observers = [] as MutationObserver[];
let observedRoots: WeakSet<Node>;

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

export function watchForStyleChanges(update: (styles: ChangedStyles) => void) {
    resetObservers();

    function handleTreeMutations(mutations: MutationRecord[]) {
        const createdStyles = new Set<HTMLLinkElement | HTMLStyleElement>();
        const removedStyles = new Set<HTMLLinkElement | HTMLStyleElement>();
        const movedStyles = new Set<HTMLLinkElement | HTMLStyleElement>();

        const additions = new Set<Element>();
        const deletions = new Set<Element>();
        mutations.forEach((m) => {
            m.addedNodes.forEach((n) => {
                if (n instanceof Element) {
                    additions.add(n);
                }
            });
            m.removedNodes.forEach((n) => {
                if (n instanceof Element) {
                    deletions.add(n);
                }
            });
        });

        const duplicateAdditions = [] as Element[];
        const duplicateDeletions = [] as Element[];
        additions.forEach((node) => {
            if (additions.has(node.parentElement)) {
                duplicateAdditions.push(node);
            }
        });
        deletions.forEach((node) => {
            if (deletions.has(node.parentElement)) {
                duplicateDeletions.push(node);
            }
        });
        duplicateAdditions.forEach((node) => additions.delete(node));
        duplicateDeletions.forEach((node) => deletions.delete(node));

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
        styleAdditions.forEach((style) => {
            if (!(removedStyles.has(style) || movedStyles.has(style))) {
                createdStyles.add(style);
            }
        });

        if (createdStyles.size + removedStyles.size + movedStyles.size > 0) {
            update({
                created: Array.from(createdStyles),
                removed: Array.from(removedStyles),
                moved: Array.from(movedStyles),
                updated: [],
            });
        }

        additions.forEach((n) => {
            if (n.isConnected) {
                iterateShadowNodes(n, subscribeForShadowRootChanges);
                collectUndefinedElements(n);
            }
        });
    }

    function handleAttributeMutations(mutations: MutationRecord[]) {
        const updatedStyles = new Set<HTMLLinkElement | HTMLStyleElement>();
        mutations.forEach((m) => {
            if (shouldManageStyle(m.target) && m.target.isConnected) {
                updatedStyles.add(m.target as HTMLLinkElement | HTMLStyleElement);
            }
        });
        if (updatedStyles.size > 0) {
            update({
                updated: Array.from(updatedStyles),
                created: [],
                removed: [],
                moved: [],
            });
        }
    }

    function observe(root: Document | ShadowRoot) {
        const treeObserver = new MutationObserver(handleTreeMutations);
        const attrObserver = new MutationObserver(handleAttributeMutations);
        treeObserver.observe(root, {childList: true, subtree: true});
        attrObserver.observe(root, {attributes: true, attributeFilter: ['rel', 'disabled'], subtree: true});
        observers.push(treeObserver, attrObserver);
        observedRoots.add(root);
    }

    function subscribeForShadowRootChanges(node: Element) {
        if (observedRoots.has(node.shadowRoot) || node.shadowRoot == null) {
            return;
        }
        observe(node.shadowRoot);
    }

    observe(document);
    iterateShadowNodes(document.documentElement, subscribeForShadowRootChanges);

    watchWhenCustomElementsDefined((hosts) => {
        const newStyles = getAllManageableStyles(hosts.map((h) => h.shadowRoot));
        update({created: newStyles, updated: [], removed: [], moved: []});
        hosts.forEach((h) => subscribeForShadowRootChanges(h));
    });
    collectUndefinedElements(document);
}

function resetObservers() {
    observers.forEach((o) => o.disconnect());
    observers.splice(0, observers.length);
    observedRoots = new WeakSet();
}

export function stopWatchingForStyleChanges() {
    resetObservers();
    unsubscribeFromDefineCustomElements();
}
