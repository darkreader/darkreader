import {forEach, push} from '../../utils/array';
import {iterateShadowHosts, createOptimizedTreeObserver, getTempCSSStyleSheet} from '../utils/dom';
import {iterateCSSDeclarations, replaceCSSVariables} from './css-rules';
import {getModifiableCSSDeclaration} from './modify-css';
import {FilterConfig} from '../../definitions';
import {isShadowDomSupported} from '../../utils/platform';
import {getDuration} from '../../utils/time';
import {throttle} from '../utils/throttle';

interface Overrides {
    [cssProp: string]: {
        customProp: string;
        cssProp: string;
        dataAttr: string;
        store: WeakSet<Node>;
    };
}

const overrides: Overrides = {
    'background-color': {
        customProp: '--darkreader-inline-bgcolor',
        cssProp: 'background-color',
        dataAttr: 'data-darkreader-inline-bgcolor',
        store: new WeakSet(),
    },
    'background-image': {
        customProp: '--darkreader-inline-bgimage',
        cssProp: 'background-image',
        dataAttr: 'data-darkreader-inline-bgimage',
        store: new WeakSet(),
    },
    'border-color': {
        customProp: '--darkreader-inline-border',
        cssProp: 'border-color',
        dataAttr: 'data-darkreader-inline-border',
        store: new WeakSet(),
    },
    'border-bottom-color': {
        customProp: '--darkreader-inline-border-bottom',
        cssProp: 'border-bottom-color',
        dataAttr: 'data-darkreader-inline-border-bottom',
        store: new WeakSet(),
    },
    'border-left-color': {
        customProp: '--darkreader-inline-border-left',
        cssProp: 'border-left-color',
        dataAttr: 'data-darkreader-inline-border-left',
        store: new WeakSet(),
    },
    'border-right-color': {
        customProp: '--darkreader-inline-border-right',
        cssProp: 'border-right-color',
        dataAttr: 'data-darkreader-inline-border-right',
        store: new WeakSet(),
    },
    'border-top-color': {
        customProp: '--darkreader-inline-border-top',
        cssProp: 'border-top-color',
        dataAttr: 'data-darkreader-inline-border-top',
        store: new WeakSet(),
    },
    'box-shadow': {
        customProp: '--darkreader-inline-boxshadow',
        cssProp: 'box-shadow',
        dataAttr: 'data-darkreader-inline-boxshadow',
        store: new WeakSet(),
    },
    'color': {
        customProp: '--darkreader-inline-color',
        cssProp: 'color',
        dataAttr: 'data-darkreader-inline-color',
        store: new WeakSet(),
    },
    'fill': {
        customProp: '--darkreader-inline-fill',
        cssProp: 'fill',
        dataAttr: 'data-darkreader-inline-fill',
        store: new WeakSet(),
    },
    'stroke': {
        customProp: '--darkreader-inline-stroke',
        cssProp: 'stroke',
        dataAttr: 'data-darkreader-inline-stroke',
        store: new WeakSet(),
    },
    'outline-color': {
        customProp: '--darkreader-inline-outline',
        cssProp: 'outline-color',
        dataAttr: 'data-darkreader-inline-outline',
        store: new WeakSet(),
    },
};

const overridesList = Object.values(overrides);

const INLINE_STYLE_ATTRS = ['style', 'fill', 'stroke', 'bgcolor', 'color'];
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

    const handleAttributionMutations = throttle((mutations: MutationRecord[]) => {
        mutations.forEach((m) => {
            if (INLINE_STYLE_ATTRS.includes(m.attributeName)) {
                elementStyleDidChange(m.target as HTMLElement);
            }
            overridesList
                .filter(({store, dataAttr}) => store.has(m.target) && !(m.target as HTMLElement).hasAttribute(dataAttr))
                .forEach(({dataAttr}) => (m.target as HTMLElement).setAttribute(dataAttr, ''));
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
                    handleAttributionMutations(attributeCache);
                }, RETRY_TIMEOUT);
                cache.push(...mutations);
                return;
            }
            start = now;
            attemptCount = 1;
        }
        handleAttributionMutations(mutations);
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

export function overrideInlineStyle(element: HTMLElement, theme: FilterConfig, variables: Map<string, string>, ignoreInlineSelectors: string[], ignoreImageSelectors: string[]) {
    const cacheKey = getInlineStyleCacheKey(element, theme);
    if (cacheKey === inlineStyleCache.get(element)) {
        return;
    }

    const unsetProps = new Set(Object.keys(overrides));

    function setCustomProp(targetCSSProp: string, modifierCSSProp: string, cssVal: string) {
        const {customProp, dataAttr} = overrides[targetCSSProp];

        const mod = getModifiableCSSDeclaration(modifierCSSProp, cssVal, null, ignoreImageSelectors, null);
        if (!mod) {
            return;
        }
        let value = mod.value;
        if (typeof value === 'function') {
            value = value(theme) as string;
        }
        element.style.setProperty(customProp, value as string);
        if (!element.hasAttribute(dataAttr)) {
            element.setAttribute(dataAttr, '');
        }
        unsetProps.delete(targetCSSProp);
    }

    if (ignoreInlineSelectors.length > 0) {
        if (shouldIgnoreInlineStyle(element, ignoreInlineSelectors)) {
            unsetProps.forEach((cssProp) => {
                const {store, dataAttr} = overrides[cssProp];
                store.delete(element);
                element.removeAttribute(dataAttr);
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
    if (element.hasAttribute('color')) {
        let value = element.getAttribute('color');
        if (value.match(/^[0-9a-f]{3}$/i) || value.match(/^[0-9a-f]{6}$/i)) {
            value = `#${value}`;
        }
        setCustomProp('color', 'color', value);
    }
    if (element.hasAttribute('fill') && element instanceof SVGElement) {
        const SMALL_SVG_LIMIT = 32;
        const value = element.getAttribute('fill');
        let isBg = false;
        if (!(element instanceof SVGTextElement)) {
            const {width, height} = element.getBoundingClientRect();
            isBg = (width > SMALL_SVG_LIMIT || height > SMALL_SVG_LIMIT);
        }
        setCustomProp('fill', isBg ? 'background-color' : 'color', value);
    }
    if (element.hasAttribute('stroke')) {
        const value = element.getAttribute('stroke');
        setCustomProp('stroke', element instanceof SVGLineElement || element instanceof SVGTextElement ? 'border-color' : 'color', value);
    }

    // Put CSS text with inserted CSS variables into separate <style> element
    // to properly handle composite properties (e.g. background -> background-color)
    let elementStyle: CSSStyleRule = null;
    const temp = getTempCSSStyleSheet();
    const cssText = replaceCSSVariables(element.style.cssText, variables);
    temp.insertRule(`temp { ${cssText} } `);
    elementStyle = temp.cssRules[0] as CSSStyleRule;
    temp.removeRule(0);

    const targetRule = elementStyle;

    targetRule.style && iterateCSSDeclarations(targetRule.style, (property, value) => {
        // Temporaty ignore background images
        // due to possible performance issues
        // and complexity of handling async requests
        if (property === 'background-image' && value.indexOf('url') >= 0) {
            return;
        }
        if (overrides.hasOwnProperty(property)) {
            setCustomProp(property, property, value);
        }
    });
    if (targetRule.style && element instanceof SVGTextElement && targetRule.style.fill) {
        setCustomProp('fill', 'color', targetRule.style.getPropertyValue('fill'));
    }

    forEach(unsetProps, (cssProp) => {
        const {store, dataAttr} = overrides[cssProp];
        store.delete(element);
        element.removeAttribute(dataAttr);
    });
    inlineStyleCache.set(element, getInlineStyleCacheKey(element, theme));
}
