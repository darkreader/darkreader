import {forEach, push} from '../../utils/array';
import type {ElementsTreeOperations} from '../utils/dom';
import {iterateShadowHosts, createOptimizedTreeObserver} from '../utils/dom';
import type {StyleElement} from './style-manager';
import {shouldManageStyle, getManageableStyles} from './style-manager';
import {isDefinedSelectorSupported} from '../../utils/platform';

const observers = [] as Array<{disconnect(): void}>;
let observedRoots: WeakSet<Node>;

interface ChangedStyles {
    created: StyleElement[];
    updated: StyleElement[];
    removed: StyleElement[];
    moved: StyleElement[];
}

const undefinedGroups = new Map<string, Set<Element>>();
let elementsDefinitionCallback: (elements: Element[]) => void;

function collectUndefinedElements(root: ParentNode) {
    if (!isDefinedSelectorSupported) {
        return;
    }
    forEach(root.querySelectorAll(':not(:defined)'),
        (el) => {
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

let canOptimizeUsingProxy = false;
document.addEventListener('__darkreader__inlineScriptsAllowed', () => {
    canOptimizeUsingProxy = true;
});

const resolvers = new Map<string, () => void>();

function handleIsDefined(e: CustomEvent<{tag: string}>) {
    canOptimizeUsingProxy = true;
    if (resolvers.has(e.detail.tag)) {
        const resolve = resolvers.get(e.detail.tag);
        resolve();
    }
}

async function customElementsWhenDefined(tag: string) {
    return new Promise<void>((resolve) => {
        // `customElements.whenDefined` is not available in extensions
        // https://bugs.chromium.org/p/chromium/issues/detail?id=390807
        if (window.customElements && typeof customElements.whenDefined === 'function') {
            customElements.whenDefined(tag).then(resolve);
        } else if (canOptimizeUsingProxy) {
            resolvers.set(tag, resolve);
            document.dispatchEvent(new CustomEvent('__darkreader__addUndefinedResolver', {detail: {tag}}));
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
    document.removeEventListener('__darkreader__isDefined', handleIsDefined);
}

export function watchForStyleChanges(currentStyles: StyleElement[], update: (styles: ChangedStyles) => void, shadowRootDiscovered: (root: ShadowRoot) => void) {
    stopWatchingForStyleChanges();

    const prevStyles = new Set<StyleElement>(currentStyles);
    const prevStyleSiblings = new WeakMap<Element, Element>();
    const nextStyleSiblings = new WeakMap<Element, Element>();

    function saveStylePosition(style: StyleElement) {
        prevStyleSiblings.set(style, style.previousElementSibling);
        nextStyleSiblings.set(style, style.nextElementSibling);
    }

    function forgetStylePosition(style: StyleElement) {
        prevStyleSiblings.delete(style);
        nextStyleSiblings.delete(style);
    }

    function didStylePositionChange(style: StyleElement) {
        return (
            style.previousElementSibling !== prevStyleSiblings.get(style) ||
            style.nextElementSibling !== nextStyleSiblings.get(style)
        );
    }

    currentStyles.forEach(saveStylePosition);

    function handleStyleOperations(operations: {createdStyles: Set<StyleElement>; movedStyles: Set<StyleElement>; removedStyles: Set<StyleElement>}) {
        const {createdStyles, removedStyles, movedStyles} = operations;

        createdStyles.forEach((s) => saveStylePosition(s));
        movedStyles.forEach((s) => saveStylePosition(s));
        removedStyles.forEach((s) => forgetStylePosition(s));

        createdStyles.forEach((s) => prevStyles.add(s));
        removedStyles.forEach((s) => prevStyles.delete(s));

        if (createdStyles.size + removedStyles.size + movedStyles.size > 0) {
            update({
                created: Array.from(createdStyles),
                removed: Array.from(removedStyles),
                moved: Array.from(movedStyles),
                updated: [],
            });
        }
    }

    function handleMinorTreeMutations({additions, moves, deletions}: ElementsTreeOperations) {
        const createdStyles = new Set<StyleElement>();
        const removedStyles = new Set<StyleElement>();
        const movedStyles = new Set<StyleElement>();

        additions.forEach((node) => getManageableStyles(node).forEach((style) => createdStyles.add(style)));
        deletions.forEach((node) => getManageableStyles(node).forEach((style) => removedStyles.add(style)));
        moves.forEach((node) => getManageableStyles(node).forEach((style) => movedStyles.add(style)));

        handleStyleOperations({createdStyles, removedStyles, movedStyles});

        additions.forEach((n) => {
            iterateShadowHosts(n, subscribeForShadowRootChanges);
            collectUndefinedElements(n);
        });
    }

    function handleHugeTreeMutations(root: Document | ShadowRoot) {
        const styles = new Set(getManageableStyles(root));

        const createdStyles = new Set<StyleElement>();
        const removedStyles = new Set<StyleElement>();
        const movedStyles = new Set<StyleElement>();
        styles.forEach((s) => {
            if (!prevStyles.has(s)) {
                createdStyles.add(s);
            }
        });
        prevStyles.forEach((s) => {
            if (!styles.has(s)) {
                removedStyles.add(s);
            }
        });
        styles.forEach((s) => {
            if (!createdStyles.has(s) && !removedStyles.has(s) && didStylePositionChange(s)) {
                movedStyles.add(s);
            }
        });

        handleStyleOperations({createdStyles, removedStyles, movedStyles});

        iterateShadowHosts(root, subscribeForShadowRootChanges);
        collectUndefinedElements(root);
    }

    function handleAttributeMutations(mutations: MutationRecord[]) {
        const updatedStyles = new Set<StyleElement>();
        const removedStyles = new Set<StyleElement>();
        mutations.forEach((m) => {
            const {target} = m;
            if (target.isConnected) {
                if (shouldManageStyle(target)) {
                    updatedStyles.add(target as StyleElement);
                } else if (target instanceof HTMLLinkElement && target.disabled) {
                    removedStyles.add(target as StyleElement);
                }
            }
        });
        if (updatedStyles.size + removedStyles.size > 0) {
            update({
                updated: Array.from(updatedStyles),
                created: [],
                removed: Array.from(removedStyles),
                moved: [],
            });
        }
    }

    function observe(root: Document | ShadowRoot) {
        const treeObserver = createOptimizedTreeObserver(root, {
            onMinorMutations: handleMinorTreeMutations,
            onHugeMutations: handleHugeTreeMutations,
        });
        const attrObserver = new MutationObserver(handleAttributeMutations);
        attrObserver.observe(root, {attributes: true, attributeFilter: ['rel', 'disabled', 'media'], subtree: true});
        observers.push(treeObserver, attrObserver);
        observedRoots.add(root);
    }

    function subscribeForShadowRootChanges(node: Element) {
        const {shadowRoot} = node;
        if (shadowRoot == null || observedRoots.has(shadowRoot)) {
            return;
        }
        observe(shadowRoot);
        shadowRootDiscovered(shadowRoot);
    }

    observe(document);
    iterateShadowHosts(document.documentElement, subscribeForShadowRootChanges);

    watchWhenCustomElementsDefined((hosts) => {
        const newStyles: StyleElement[] = [];
        hosts.forEach((host) => push(newStyles, getManageableStyles(host.shadowRoot)));
        update({created: newStyles, updated: [], removed: [], moved: []});
        hosts.forEach((host) => {
            const {shadowRoot} = host;
            if (shadowRoot == null) {
                return;
            }
            subscribeForShadowRootChanges(host);
            iterateShadowHosts(shadowRoot, subscribeForShadowRootChanges);
            collectUndefinedElements(shadowRoot);
        });
    });
    document.addEventListener('__darkreader__isDefined', handleIsDefined);
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
