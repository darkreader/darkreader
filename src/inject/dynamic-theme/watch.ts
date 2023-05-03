import {forEach, push} from '../../utils/array';
import type {ElementsTreeOperations} from '../utils/dom';
import {iterateShadowHosts, createOptimizedTreeObserver} from '../utils/dom';
import type {StyleElement} from './style-manager';
import {shouldManageStyle, getManageableStyles} from './style-manager';
import {isDefinedSelectorSupported} from '../../utils/platform';
import {logAssert} from '../utils/log';

declare const __DEBUG__: boolean;
declare const __TEST__: boolean;

const observers: Array<{disconnect(): void}> = [];
let observedRoots: WeakSet<Node>;

interface ChangedStyles {
    created: StyleElement[];
    updated: StyleElement[];
    removed: StyleElement[];
    moved: StyleElement[];
}

// Set of lower-case custom element names which were already defined
const definedCustomElements = new Set<string>();
const undefinedGroups = new Map<string, Set<Element>>();
let elementsDefinitionCallback: ((elements: Element[]) => void) | null;

function recordUndefinedElement(element: Element): void {
    let tag = element.tagName.toLowerCase();
    if (!tag.includes('-')) {
        const extendedTag = element.getAttribute('is');
        if (extendedTag) {
            tag = extendedTag;
        } else {
            // Happens for <template> on YouTube
            return;
        }
    }
    if (!undefinedGroups.has(tag)) {
        undefinedGroups.set(tag, new Set());
        customElementsWhenDefined(tag).then(() => {
            if (elementsDefinitionCallback) {
                const elements = undefinedGroups.get(tag);
                undefinedGroups.delete(tag);
                elementsDefinitionCallback(Array.from(elements!));
            }
        });
    }
    undefinedGroups.get(tag)!.add(element);
}

function collectUndefinedElements(root: ParentNode): void {
    if (!isDefinedSelectorSupported) {
        return;
    }
    forEach(root.querySelectorAll(':not(:defined)'), recordUndefinedElement);
}

let canOptimizeUsingProxy = false;
document.addEventListener('__darkreader__inlineScriptsAllowed', () => {
    canOptimizeUsingProxy = true;
}, {once: true, passive: true});

const resolvers = new Map<string, Array<() => void>>();

function handleIsDefined(e: CustomEvent<{tag: string}>) {
    canOptimizeUsingProxy = true;
    const tag = e.detail.tag;
    definedCustomElements.add(tag);
    if (resolvers.has(tag)) {
        const r = resolvers.get(tag)!;
        resolvers.delete(tag);
        r.forEach((r) => r());
    }
}

async function customElementsWhenDefined(tag: string): Promise<void> {
    if ((__TEST__ || __DEBUG__)) {
        if (tag.toLowerCase() !== tag) {
            logAssert('customElementsWhenDefined expects lower-case node names');
            throw new Error('customElementsWhenDefined expects lower-case node names');
        }
    }
    // Custom element is already defined
    if (definedCustomElements.has(tag)) {
        return;
    }
    // We need to await for element to be defined
    return new Promise<void>((resolve) => {
        // `customElements.whenDefined` is not available in extensions
        // https://bugs.chromium.org/p/chromium/issues/detail?id=390807
        if (window.customElements && typeof customElements.whenDefined === 'function') {
            customElements.whenDefined(tag).then(() => resolve());
        } else if (canOptimizeUsingProxy) {
            if (resolvers.has(tag)) {
                resolvers.get(tag)!.push(resolve);
            } else {
                resolvers.set(tag, [resolve]);
            }
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

function watchWhenCustomElementsDefined(callback: (elements: Element[]) => void): void {
    elementsDefinitionCallback = callback;
}

function unsubscribeFromDefineCustomElements(): void {
    elementsDefinitionCallback = null;
    undefinedGroups.clear();
    document.removeEventListener('__darkreader__isDefined', handleIsDefined);
}

export function watchForStyleChanges(currentStyles: StyleElement[], update: (styles: ChangedStyles) => void, shadowRootDiscovered: (root: ShadowRoot) => void): void {
    stopWatchingForStyleChanges();

    const prevStyles = new Set<StyleElement>(currentStyles);
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
            extendedIterateShadowHosts(n);
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

        extendedIterateShadowHosts(root);
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
        attrObserver.observe(root, {attributes: true, attributeFilter: ['rel', 'disabled', 'media', 'href'], subtree: true});
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

    function extendedIterateShadowHosts(node: Node) {
        iterateShadowHosts(node, subscribeForShadowRootChanges);
    }

    observe(document);
    extendedIterateShadowHosts(document.documentElement);

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
            extendedIterateShadowHosts(shadowRoot);
            collectUndefinedElements(shadowRoot);
        });
    });
    document.addEventListener('__darkreader__isDefined', handleIsDefined, {passive: true});
    collectUndefinedElements(document);
}

function resetObservers() {
    observers.forEach((o) => o.disconnect());
    observers.splice(0, observers.length);
    observedRoots = new WeakSet();
}

export function stopWatchingForStyleChanges(): void {
    resetObservers();
    unsubscribeFromDefineCustomElements();
}
