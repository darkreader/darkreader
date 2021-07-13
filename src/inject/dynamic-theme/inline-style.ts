import {forEach, push} from '../../utils/array';
import {iterateShadowHosts, createOptimizedTreeObserver, isReadyStateComplete, addReadyStateCompleteListener} from '../utils/dom';
import {iterateCSSDeclarations} from './css-rules';
import {getModifiableCSSDeclaration} from './modify-css';
import {variablesStore} from './variables';
import type {FilterConfig} from '../../definitions';
import {isShadowDomSupported} from '../../utils/platform';
import {getDuration} from '../../utils/time';
import {throttle} from '../utils/throttle';

interface Overrides {
    [cssProp: string]: {
        customProp: string;
        cssProp: string;
        dataAttr: string;
    };
}

const overrides: Overrides = {
    'background-color': {
        customProp: '--darkreader-inline-bgcolor',
        cssProp: 'background-color',
        dataAttr: 'data-darkreader-inline-bgcolor',
    },
    'background-image': {
        customProp: '--darkreader-inline-bgimage',
        cssProp: 'background-image',
        dataAttr: 'data-darkreader-inline-bgimage',
    },
    'border-color': {
        customProp: '--darkreader-inline-border',
        cssProp: 'border-color',
        dataAttr: 'data-darkreader-inline-border',
    },
    'border-bottom-color': {
        customProp: '--darkreader-inline-border-bottom',
        cssProp: 'border-bottom-color',
        dataAttr: 'data-darkreader-inline-border-bottom',
    },
    'border-left-color': {
        customProp: '--darkreader-inline-border-left',
        cssProp: 'border-left-color',
        dataAttr: 'data-darkreader-inline-border-left',
    },
    'border-right-color': {
        customProp: '--darkreader-inline-border-right',
        cssProp: 'border-right-color',
        dataAttr: 'data-darkreader-inline-border-right',
    },
    'border-top-color': {
        customProp: '--darkreader-inline-border-top',
        cssProp: 'border-top-color',
        dataAttr: 'data-darkreader-inline-border-top',
    },
    'box-shadow': {
        customProp: '--darkreader-inline-boxshadow',
        cssProp: 'box-shadow',
        dataAttr: 'data-darkreader-inline-boxshadow',
    },
    'color': {
        customProp: '--darkreader-inline-color',
        cssProp: 'color',
        dataAttr: 'data-darkreader-inline-color',
    },
    'fill': {
        customProp: '--darkreader-inline-fill',
        cssProp: 'fill',
        dataAttr: 'data-darkreader-inline-fill',
    },
    'stroke': {
        customProp: '--darkreader-inline-stroke',
        cssProp: 'stroke',
        dataAttr: 'data-darkreader-inline-stroke',
    },
    'outline-color': {
        customProp: '--darkreader-inline-outline',
        cssProp: 'outline-color',
        dataAttr: 'data-darkreader-inline-outline',
    },
    'stop-color': {
        customProp: '--darkreader-inline-stopcolor',
        cssProp: 'stop-color',
        dataAttr: 'data-darkreader-inline-stopcolor',
    },
};

const overridesList = Object.values(overrides);
const normalizedPropList = {};
overridesList.forEach(({cssProp, customProp}) => normalizedPropList[customProp] = cssProp);

const INLINE_STYLE_ATTRS = ['style', 'fill', 'stop-color', 'stroke', 'bgcolor', 'color'];
export const INLINE_STYLE_SELECTOR = INLINE_STYLE_ATTRS.map((attr) => `[${attr}]`).join(', ');

export function getInlineOverrideStyle() {
    return overridesList.map(({dataAttr, customProp, cssProp}) => {
        return [
            `[${dataAttr}] {`,
            `  ${cssProp}: var(${customProp}) !important;`,
            '}',
        ].join('\n');
    }).join('\n');
}

function getInlineStyleElements(root: Node) {
    const results: Element[] = [];
    if (root instanceof Element && root.matches(INLINE_STYLE_SELECTOR)) {
        results.push(root);
    }
    if (root instanceof Element || (isShadowDomSupported && root instanceof ShadowRoot) || root instanceof Document) {
        push(results, root.querySelectorAll(INLINE_STYLE_SELECTOR));
    }
    return results;
}

const treeObservers = new Map<Node, {disconnect(): void}>();
const attrObservers = new Map<Node, MutationObserver>();

export function watchForInlineStyles(
    elementStyleDidChange: (element: HTMLElement) => void,
    shadowRootDiscovered: (root: ShadowRoot) => void,
) {
    deepWatchForInlineStyles(document, elementStyleDidChange, shadowRootDiscovered);
    iterateShadowHosts(document.documentElement, (host) => {
        deepWatchForInlineStyles(host.shadowRoot, elementStyleDidChange, shadowRootDiscovered);
    });
}

function deepWatchForInlineStyles(
    root: Document | ShadowRoot,
    elementStyleDidChange: (element: HTMLElement) => void,
    shadowRootDiscovered: (root: ShadowRoot) => void,
) {
    if (treeObservers.has(root)) {
        treeObservers.get(root).disconnect();
        attrObservers.get(root).disconnect();
    }

    const discoveredNodes = new WeakSet<Node>();

    function discoverNodes(node: Node) {
        getInlineStyleElements(node).forEach((el: HTMLElement) => {
            if (discoveredNodes.has(el)) {
                return;
            }
            discoveredNodes.add(el);
            elementStyleDidChange(el);
        });
        iterateShadowHosts(node, (n) => {
            if (discoveredNodes.has(node)) {
                return;
            }
            discoveredNodes.add(node);
            shadowRootDiscovered(n.shadowRoot);
            deepWatchForInlineStyles(n.shadowRoot, elementStyleDidChange, shadowRootDiscovered);
        });
    }

    const treeObserver = createOptimizedTreeObserver(root, {
        onMinorMutations: ({additions}) => {
            additions.forEach((added) => discoverNodes(added));
        },
        onHugeMutations: () => {
            discoverNodes(root);
        },
    });
    treeObservers.set(root, treeObserver);

    let attemptCount = 0;
    let start = null;
    const ATTEMPTS_INTERVAL = getDuration({seconds: 10});
    const RETRY_TIMEOUT = getDuration({seconds: 2});
    const MAX_ATTEMPTS_COUNT = 50;
    let cache: MutationRecord[] = [];
    let timeoutId: number = null;

    const handleAttributeMutations = throttle((mutations: MutationRecord[]) => {
        mutations.forEach((m) => {
            if (INLINE_STYLE_ATTRS.includes(m.attributeName)) {
                elementStyleDidChange(m.target as HTMLElement);
            }
        });
    });
    const attrObserver = new MutationObserver((mutations) => {
        if (timeoutId) {
            cache.push(...mutations);
            return;
        }
        attemptCount++;
        const now = Date.now();
        if (start == null) {
            start = now;
        } else if (attemptCount >= MAX_ATTEMPTS_COUNT) {
            if (now - start < ATTEMPTS_INTERVAL) {
                timeoutId = setTimeout(() => {
                    start = null;
                    attemptCount = 0;
                    timeoutId = null;
                    const attributeCache = cache;
                    cache = [];
                    handleAttributeMutations(attributeCache);
                }, RETRY_TIMEOUT);
                cache.push(...mutations);
                return;
            }
            start = now;
            attemptCount = 1;
        }
        handleAttributeMutations(mutations);
    });
    attrObserver.observe(root, {
        attributes: true,
        attributeFilter: INLINE_STYLE_ATTRS.concat(overridesList.map(({dataAttr}) => dataAttr)),
        subtree: true,
    });
    attrObservers.set(root, attrObserver);
}

export function stopWatchingForInlineStyles() {
    treeObservers.forEach((o) => o.disconnect());
    attrObservers.forEach((o) => o.disconnect());
    treeObservers.clear();
    attrObservers.clear();
}

const inlineStyleCache = new WeakMap<HTMLElement, string>();
const filterProps = ['brightness', 'contrast', 'grayscale', 'sepia', 'mode'];

function getInlineStyleCacheKey(el: HTMLElement, theme: FilterConfig) {
    return INLINE_STYLE_ATTRS
        .map((attr) => `${attr}="${el.getAttribute(attr)}"`)
        .concat(filterProps.map((prop) => `${prop}="${theme[prop]}"`))
        .join(' ');
}

function shouldIgnoreInlineStyle(element: HTMLElement, selectors: string[]) {
    for (let i = 0, len = selectors.length; i < len; i++) {
        const ingnoredSelector = selectors[i];
        if (element.matches(ingnoredSelector)) {
            return true;
        }
    }
    return false;
}

export function overrideInlineStyle(element: HTMLElement, theme: FilterConfig, ignoreInlineSelectors: string[], ignoreImageSelectors: string[]) {
    const cacheKey = getInlineStyleCacheKey(element, theme);
    if (cacheKey === inlineStyleCache.get(element)) {
        return;
    }

    const unsetProps = new Set(Object.keys(overrides));

    function setCustomProp(targetCSSProp: string, modifierCSSProp: string, cssVal: string) {
        const {customProp, dataAttr} = overrides[targetCSSProp];

        const mod = getModifiableCSSDeclaration(modifierCSSProp, cssVal, {} as CSSStyleRule, variablesStore, ignoreImageSelectors, null);
        if (!mod) {
            return;
        }
        let value = mod.value;
        if (typeof value === 'function') {
            value = value(theme) as string;
        }
        element.style.setProperty(customProp, value);
        if (!element.hasAttribute(dataAttr)) {
            element.setAttribute(dataAttr, '');
        }
        unsetProps.delete(targetCSSProp);
    }

    if (ignoreInlineSelectors.length > 0) {
        if (shouldIgnoreInlineStyle(element, ignoreInlineSelectors)) {
            unsetProps.forEach((cssProp) => {
                element.removeAttribute(overrides[cssProp].dataAttr);
            });
            return;
        }
    }

    if (element.hasAttribute('bgcolor')) {
        let value = element.getAttribute('bgcolor');
        if (value.match(/^[0-9a-f]{3}$/i) || value.match(/^[0-9a-f]{6}$/i)) {
            value = `#${value}`;
        }
        setCustomProp('background-color', 'background-color', value);
    }

    // We can catch some link elements here, that are from `<link rel="mask-icon" color="#000000">`.
    // It's valid HTML code according to the specs, https://html.spec.whatwg.org/#attr-link-color
    // We don't want to touch such link as it cause weird behavior of the browser(Silent DOMException).
    if (element.hasAttribute('color') && (element as HTMLLinkElement).rel !== 'mask-icon') {
        let value = element.getAttribute('color');
        if (value.match(/^[0-9a-f]{3}$/i) || value.match(/^[0-9a-f]{6}$/i)) {
            value = `#${value}`;
        }
        setCustomProp('color', 'color', value);
    }
    if (element instanceof SVGElement) {
        if (element.hasAttribute('fill')) {
            const SMALL_SVG_LIMIT = 32;
            const value = element.getAttribute('fill');
            if (!(element instanceof SVGTextElement)) {
                // getBoundingClientRect forces a layout change. And when it so happens that.
                // The DOM is not in the `complete` readystate. It will cause the layout to be drawn.
                // And it will cause a layout of unstyled content which results in white flashes.
                // Therefor the check if the DOM is at the `complete` readystate.
                const handleSVGElement = () => {
                    const {width, height} = element.getBoundingClientRect();
                    const isBg = (width > SMALL_SVG_LIMIT || height > SMALL_SVG_LIMIT);
                    setCustomProp('fill', isBg ? 'background-color' : 'color', value);
                };
                if (isReadyStateComplete()) {
                    handleSVGElement();
                } else {
                    addReadyStateCompleteListener(handleSVGElement);
                }
            } else {
                setCustomProp('fill', 'color', value);
            }
        }
        if (element.hasAttribute('stop-color')) {
            setCustomProp('stop-color', 'background-color', element.getAttribute('stop-color'));
        }
    }
    if (element.hasAttribute('stroke')) {
        const value = element.getAttribute('stroke');
        setCustomProp('stroke', element instanceof SVGLineElement || element instanceof SVGTextElement ? 'border-color' : 'color', value);
    }
    element.style && iterateCSSDeclarations(element.style, (property, value) => {
        // Temporaty ignore background images
        // due to possible performance issues
        // and complexity of handling async requests
        if (property === 'background-image' && value.includes('url')) {
            return;
        }
        if (overrides.hasOwnProperty(property)) {
            setCustomProp(property, property, value);
        } else {
            const overridenProp = normalizedPropList[property];
            if (overridenProp && (!element.style.getPropertyValue(overridenProp) && !element.hasAttribute(overridenProp))) {
                element.style.setProperty(property, '');
            }
        }
    });
    if (element.style && element instanceof SVGTextElement && element.style.fill) {
        setCustomProp('fill', 'color', element.style.getPropertyValue('fill'));
    }

    forEach(unsetProps, (cssProp) => {
        element.removeAttribute(overrides[cssProp].dataAttr);
    });
    inlineStyleCache.set(element, getInlineStyleCacheKey(element, theme));
}
