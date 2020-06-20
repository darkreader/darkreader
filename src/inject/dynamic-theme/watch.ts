import {forEach, push} from '../../utils/array';
import {isDefinedSelectorSupported} from '../../utils/platform';
import {iterateShadowNodes, createOptimizedTreeObserver, ElementsTreeOperations} from '../utils/dom';
import {shouldManageStyle, getManageableStyles, StyleElement} from './style-manager';

const observers = [] as {disconnect(): void}[];
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
    if (!isDefinedSelectorSupported()) {
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
            iterateShadowNodes(n, subscribeForShadowRootChanges);
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

        iterateShadowNodes(root, subscribeForShadowRootChanges);
        collectUndefinedElements(root);
    }

    function handleAttributeMutations(mutations: MutationRecord[]) {
        const updatedStyles = new Set<StyleElement>();
        mutations.forEach((m) => {
            if (shouldManageStyle(m.target) && m.target.isConnected) {
                updatedStyles.add(m.target as StyleElement);
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
        const treeObserver = createOptimizedTreeObserver(root, {
            onMinorMutations: handleMinorTreeMutations,
            onHugeMutations: handleHugeTreeMutations,
        });
        const attrObserver = new MutationObserver(handleAttributeMutations);
        attrObserver.observe(root, {attributes: true, attributeFilter: ['rel', 'disabled'], subtree: true});
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
    iterateShadowNodes(document.documentElement, subscribeForShadowRootChanges);

    watchWhenCustomElementsDefined((hosts) => {
        const newStyles: StyleElement[] = [];
        hosts.forEach((host) => push(newStyles, getManageableStyles(host.shadowRoot)));
        update({created: newStyles, updated: [], removed: [], moved: []});
        hosts.forEach((host) => {
            const {shadowRoot} = host;
            subscribeForShadowRootChanges(host);
            iterateShadowNodes(shadowRoot, subscribeForShadowRootChanges);
            collectUndefinedElements(shadowRoot);
        });
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
