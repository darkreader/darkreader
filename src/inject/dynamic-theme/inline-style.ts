import {forEach, push} from '../../utils/array';
import {iterateShadowNodes} from '../utils/dom';
import {iterateCSSDeclarations} from './css-rules';
import {getModifiableCSSDeclaration} from './modify-css';
import {FilterConfig} from '../../definitions';

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

function expand(nodes: ArrayLike<Node>, selector: string) {
    const results: Node[] = [];
    forEach(nodes, (n) => {
        if (n instanceof Element) {
            if (n.matches(selector)) {
                results.push(n);
            }
            push(results, n.querySelectorAll(selector));
        }
    });
    return results;
}

const observers = new Map<Node, MutationObserver>();

export function watchForInlineStyles(
    elementStyleDidChange: (element: HTMLElement) => void,
    shadowRootDiscovered: (root: ShadowRoot) => void,
) {
    deepWatchForInlineStyles(document.documentElement, elementStyleDidChange, shadowRootDiscovered);
    iterateShadowNodes(document.documentElement, (node) => {
        deepWatchForInlineStyles(node.shadowRoot, elementStyleDidChange, shadowRootDiscovered);
    });
}

export function deepWatchForInlineStyles(
    root: Node,
    elementStyleDidChange: (element: HTMLElement) => void,
    shadowRootDiscovered: (root: ShadowRoot) => void,
) {
    if (observers.has(root)) {
        observers.get(root).disconnect();
    }
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
            const createdInlineStyles = expand(m.addedNodes, INLINE_STYLE_SELECTOR);
            if (createdInlineStyles.length > 0) {
                createdInlineStyles.forEach((el: HTMLElement) => elementStyleDidChange(el));
            }
            if (m.type === 'attributes') {
                if (INLINE_STYLE_ATTRS.includes(m.attributeName)) {
                    elementStyleDidChange(m.target as HTMLElement);
                }
                overridesList
                    .filter(({store, dataAttr}) => store.has(m.target) && !(m.target as HTMLElement).hasAttribute(dataAttr))
                    .forEach(({dataAttr}) => (m.target as HTMLElement).setAttribute(dataAttr, ''));
            }
        });
        mutations.forEach((m) => {
            m.addedNodes.forEach((added) => {
                if (added.isConnected) {
                    iterateShadowNodes(added, (n) => {
                        shadowRootDiscovered(n.shadowRoot);
                        deepWatchForInlineStyles(n.shadowRoot, elementStyleDidChange, shadowRootDiscovered);
                    });
                }
            });
        });
    });
    observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: INLINE_STYLE_ATTRS.concat(overridesList.map(({dataAttr}) => dataAttr)),
    });
    observers.set(root, observer);
}

export function stopWatchingForInlineStyles() {
    observers.forEach((o) => o.disconnect());
    observers.clear();
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
    for (let i = 0; i < selectors.length; i++) {
        const ingnoredSelector = selectors[i];
        if (element.matches(ingnoredSelector)) {
            return true;
        }
    }
    return false;
}

export function overrideInlineStyle(element: HTMLElement, theme: FilterConfig, ignoreSelectors: string[]) {
    const cacheKey = getInlineStyleCacheKey(element, theme);
    if (cacheKey === inlineStyleCache.get(element)) {
        return;
    }

    const unsetProps = new Set(Object.keys(overrides));

    function setCustomProp(targetCSSProp: string, modifierCSSProp: string, cssVal: string) {
        const {customProp, dataAttr} = overrides[targetCSSProp];

        const mod = getModifiableCSSDeclaration(modifierCSSProp, cssVal, null, null);
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

    if (ignoreSelectors.length > 0) {
        if (shouldIgnoreInlineStyle(element, ignoreSelectors)) {
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
    element.style && iterateCSSDeclarations(element.style, (property, value) => {
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
    if (element.style && element instanceof SVGTextElement && element.style.fill) {
        setCustomProp('fill', 'color', element.style.getPropertyValue('fill'));
    }

    forEach(unsetProps, (cssProp) => {
        const {store, dataAttr} = overrides[cssProp];
        store.delete(element);
        element.removeAttribute(dataAttr);
    });
    inlineStyleCache.set(element, getInlineStyleCacheKey(element, theme));
}
