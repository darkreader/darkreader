import {forEach} from '../../../utils/array';
import {isDefinedSelectorSupported} from '../../../utils/platform';
import {ASSERT} from '../../utils/log';

// Set of lower-case custom element names which were already defined
const definedCustomElements = new Set<string>();
const undefinedGroups = new Map<string, Set<Element>>();
let elementsDefinitionCallback: ((elements: Element[]) => void) | null;

export function isCustomElement(element: Element): boolean {
    if (element.tagName.includes('-') || element.getAttribute('is')) {
        return true;
    }
    return false;
}

export function recordUndefinedElement(element: Element): void {
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
                ASSERT('recordUndefinedElement() undefined groups should not be empty', elements);
                undefinedGroups.delete(tag);
                elementsDefinitionCallback(Array.from(elements!));
            }
        });
    }
    undefinedGroups.get(tag)!.add(element);
}

export function collectUndefinedElements(root: ParentNode): void {
    if (!isDefinedSelectorSupported) {
        return;
    }
    forEach(root.querySelectorAll(':not(:defined)'), recordUndefinedElement);
}

let canOptimizeUsingProxy = false;
document.addEventListener('__darkreader__inlineScriptsAllowed', () => {
    canOptimizeUsingProxy = true;
}, {once: true, passive: true});

const unhandledShadowHosts = new Set<Element>();

document.addEventListener('__darkreader__shadowDomAttaching', (e: CustomEvent) => {
    const host = (e.target as HTMLElement);
    if (unhandledShadowHosts.size === 0) {
        queueMicrotask(() => {
            const hosts = [...unhandledShadowHosts].filter((el) => el.shadowRoot);
            elementsDefinitionCallback?.(hosts);
            unhandledShadowHosts.clear();
        });
    }
    unhandledShadowHosts.add(host);
});

const resolvers = new Map<string, Array<() => void>>();

export function handleIsDefined(e: CustomEvent<{tag: string}>): void {
    canOptimizeUsingProxy = true;
    const tag = e.detail.tag;
    ASSERT('handleIsDefined() expects lower-case node names', () => tag.toLowerCase() === tag);
    definedCustomElements.add(tag);
    if (resolvers.has(tag)) {
        const r = resolvers.get(tag)!;
        resolvers.delete(tag);
        r.forEach((r) => r());
    }
}

async function customElementsWhenDefined(tag: string): Promise<void> {
    ASSERT('customElementsWhenDefined() expects lower-case node names', () => tag.toLowerCase() === tag);
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

export function watchWhenCustomElementsDefined(callback: (elements: Element[]) => void): void {
    elementsDefinitionCallback = callback;
}

export function unsubscribeFromDefineCustomElements(): void {
    elementsDefinitionCallback = null;
    undefinedGroups.clear();
    document.removeEventListener('__darkreader__isDefined', handleIsDefined);
}
