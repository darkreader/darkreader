import {forEach, push} from '../../../utils/array';
import type {ElementsTreeOperations} from '../../utils/dom';
import {iterateShadowHosts, createOptimizedTreeObserver, addDOMReadyListener} from '../../utils/dom';
import {checkImageSelectors} from '../modify-css';
import type {StyleElement} from '../style-manager';
import {shouldManageStyle, getManageableStyles} from '../style-manager';

import {collectUndefinedElements, handleIsDefined, isCustomElement, recordUndefinedElement, unsubscribeFromDefineCustomElements, watchWhenCustomElementsDefined} from './custom-elements';

const observers: Array<{disconnect(): void}> = [];
let observedRoots: WeakSet<Node>;
let handledShadowHosts: WeakSet<Node>;

interface ChangedStyles {
    created: StyleElement[];
    updated: StyleElement[];
    removed: StyleElement[];
    moved: StyleElement[];
}

export function watchForStylePositions(
    currentStyles: StyleElement[],
    update: (styles: ChangedStyles) => void,
    shadowRootDiscovered: (root: ShadowRoot) => void
): void {
    stopWatchingForStylePositions();

    const prevStylesByRoot = new WeakMap<Node, Set<StyleElement>>();
    const getPrevStyles = (root: Node) => {
        if (!prevStylesByRoot.has(root)) {
            prevStylesByRoot.set(root, new Set());
        }
        return prevStylesByRoot.get(root)!;
    };
    currentStyles.forEach((node) => {
        let root: Node | null = node;
        while ((root = root.parentNode)) {
            if (root === document || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                const prevStyles = getPrevStyles(root);
                prevStyles.add(node);
                break;
            }
        }
    });
    const prevStyleSiblings = new WeakMap<Element, Element>();
    const nextStyleSiblings = new WeakMap<Element, Element>();

    function saveStylePosition(style: StyleElement) {
        prevStyleSiblings.set(style, style.previousElementSibling!);
        nextStyleSiblings.set(style, style.nextElementSibling!);
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

    function handleStyleOperations(root: Document | ShadowRoot, operations: {createdStyles: Set<StyleElement>; movedStyles: Set<StyleElement>; removedStyles: Set<StyleElement>}) {
        const {createdStyles, removedStyles, movedStyles} = operations;

        createdStyles.forEach((s) => saveStylePosition(s));
        movedStyles.forEach((s) => saveStylePosition(s));
        removedStyles.forEach((s) => forgetStylePosition(s));

        const prevStyles = getPrevStyles(root);
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

    function handleMinorTreeMutations(root: Document | ShadowRoot, {additions, moves, deletions}: ElementsTreeOperations) {
        const createdStyles = new Set<StyleElement>();
        const removedStyles = new Set<StyleElement>();
        const movedStyles = new Set<StyleElement>();

        additions.forEach((node) => getManageableStyles(node).forEach((style) => createdStyles.add(style)));
        deletions.forEach((node) => getManageableStyles(node).forEach((style) => removedStyles.add(style)));
        moves.forEach((node) => getManageableStyles(node).forEach((style) => movedStyles.add(style)));

        handleStyleOperations(root, {createdStyles, removedStyles, movedStyles});

        const potentialHosts = new Set<Element>();
        additions.forEach((n) => {
            if (n.parentElement) {
                potentialHosts.add(n.parentElement);
            }
            if (n.previousElementSibling) {
                potentialHosts.add(n.previousElementSibling);
            }

            deepObserve(n);
            collectUndefinedElements(n);
        });
        potentialHosts.forEach((el) => {
            if (el.shadowRoot && !observedRoots.has(el)) {
                // Some shadow roots could be created using templates
                subscribeForShadowRootChanges(el);
                deepObserve(el.shadowRoot);
            }
        });

        // Firefox occasionally fails to reflect existence of a node in both CSS's view of the DOM (':not(:defined)'),
        // and in DOM walker's view of the DOM. So instead we also check these mutations just in case.
        // In practice, at least one place reflects appearance of the node.
        // URL for testing: https://chromestatus.com/roadmap
        additions.forEach((node) => isCustomElement(node) && recordUndefinedElement(node));

        additions.forEach((node) => checkImageSelectors(node));
    }

    function handleHugeTreeMutations(root: Document | ShadowRoot) {
        const styles = new Set(getManageableStyles(root));

        const createdStyles = new Set<StyleElement>();
        const removedStyles = new Set<StyleElement>();
        const movedStyles = new Set<StyleElement>();
        const prevStyles = getPrevStyles(root);
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

        handleStyleOperations(root, {createdStyles, removedStyles, movedStyles});

        deepObserve(root);
        collectUndefinedElements(root);

        checkImageSelectors(root);
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
        if (observedRoots.has(root)) {
            return;
        }
        const treeObserver = createOptimizedTreeObserver(root, {
            onMinorMutations: handleMinorTreeMutations,
            onHugeMutations: handleHugeTreeMutations,
        });
        const attrObserver = new MutationObserver(handleAttributeMutations);
        attrObserver.observe(root, {attributeFilter: ['rel', 'disabled', 'media', 'href'], subtree: true});
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

    function deepObserve(node: Node) {
        iterateShadowHosts(node, subscribeForShadowRootChanges);
    }

    observe(document);
    deepObserve(document.documentElement);

    watchWhenCustomElementsDefined((hosts) => {
        hosts = hosts.filter((node) => !handledShadowHosts.has(node));
        const newStyles: StyleElement[] = [];
        hosts.forEach((host) => push(newStyles, getManageableStyles(host.shadowRoot)));
        update({created: newStyles, updated: [], removed: [], moved: []});
        hosts.forEach((host) => {
            const {shadowRoot} = host;
            if (shadowRoot == null) {
                return;
            }
            subscribeForShadowRootChanges(host);
            deepObserve(shadowRoot);
            collectUndefinedElements(shadowRoot);
        });
        hosts.forEach((node) => handledShadowHosts.add(node));
    });
    document.addEventListener('__darkreader__isDefined', handleIsDefined);
    collectUndefinedElements(document);

    addDOMReadyListener(() => {
        // Some shadow roots could be created using templates
        forEach(document.body.children, (el) => {
            if (el.shadowRoot && !observedRoots.has(el)) {
                subscribeForShadowRootChanges(el);
                deepObserve(el.shadowRoot);
            }
        });
    });
}

function resetObservers() {
    observers.forEach((o) => o.disconnect());
    observers.splice(0, observers.length);
    observedRoots = new WeakSet();
    handledShadowHosts = new WeakSet();
}

export function stopWatchingForStylePositions(): void {
    resetObservers();
    unsubscribeFromDefineCustomElements();
}
