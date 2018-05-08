import {iterateCSSDeclarations} from './css-rules';
import {getModifiableCSSDeclaration, ModifiableCSSDeclaration} from './modify-css';
import {FilterConfig} from '../../definitions';

const STORE = 'darkreaderInlineId';
const STORE_ATTR = 'data-darkreader-inline-id';
const INLINE_STYLE_SELECTOR = '[style], [bgcolor], [fill], [stroke]';

let elementsCounter = 0;
const inlineStyleElementsIds = new WeakMap<Node, string>();
const inlineStyleOverrides = new Map<Node, string>();
let observer: MutationObserver = null;

export function getInlineStylesOverrides(filter: FilterConfig) {
    const elements = Array.from(document.querySelectorAll(INLINE_STYLE_SELECTOR));
    elements.forEach((el) => elementDidUpdate(el as HTMLElement, filter));
    return Array.from(inlineStyleOverrides.values()).filter((x) => x);
}

function expand(nodes: Node[], selector: string) {
    const results: Node[] = [];
    nodes.forEach((n) => {
        if (n instanceof Element) {
            if (n.matches(selector)) {
                results.push(n);
            }
            results.push(...Array.from(n.querySelectorAll(selector)));
        }
    });
    return results;
}

export function watchForInlineStyles(filter: FilterConfig, update: (styles: string[]) => void) {
    if (observer) {
        observer.disconnect();
    }
    observer = new MutationObserver((mutations) => {
        const prevValues = new Map<Node, string>();
        inlineStyleOverrides.forEach((value, key) => prevValues.set(key, value));
        let didStyleChange = false;
        mutations.forEach((m) => {
            const createdInlineStyles = expand(Array.from(m.addedNodes), INLINE_STYLE_SELECTOR);
            const removedInlineStyles = expand(Array.from(m.removedNodes), INLINE_STYLE_SELECTOR);
            if (createdInlineStyles.length > 0) {
                didStyleChange = true;
                createdInlineStyles.forEach((el) => elementDidUpdate(el as HTMLElement, filter));
            }
            if (removedInlineStyles.length > 0) {
                didStyleChange = true;
                Array.from(m.removedNodes).forEach(elementDidUnmount);
            }
            if (m.type === 'attributes') {
                if (m.attributeName === 'style' || m.attributeName === 'bgcolor' || m.attributeName === 'fill' || m.attributeName === 'stroke') {
                    didStyleChange = true;
                    elementDidUpdate(m.target as HTMLElement, filter);
                }
                if (m.attributeName === STORE_ATTR && !(m.target as HTMLElement).dataset[STORE]) {
                    (m.target as HTMLElement).dataset[STORE] = inlineStyleElementsIds.get(m.target);
                }
            }
        });
        if (didStyleChange) {
            if (Array.from(inlineStyleOverrides.entries()).some(([node, value]) => prevValues.get(node) !== value)) {
                update(Array.from(inlineStyleOverrides.values()).filter((x) => x));
            }
        }
    });
    observer.observe(document, {childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'bgcolor', STORE_ATTR]});
}

export function stopWatchingForInlineStyles() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
}

function elementDidUpdate(element: HTMLElement, filter: FilterConfig) {
    if (!inlineStyleOverrides.has(element)) {
        const id = (++elementsCounter).toString(16);
        inlineStyleElementsIds.set(element, id);
    }
    const override = getInlineStyleOverride(element, filter);
    inlineStyleOverrides.set(element, override);
}

function elementDidUnmount(element: HTMLElement) {
    inlineStyleOverrides.delete(element);
}

function getInlineStyleOverride(element: HTMLElement, filter: FilterConfig) {
    const modDecs: ModifiableCSSDeclaration[] = [];
    if (element.hasAttribute('bgcolor')) {
        let value = element.getAttribute('bgcolor');
        if (value.match(/^[0-9a-f]{3}$/i) || value.match(/^[0-9a-f]{6}$/i)) {
            value = `#${value}`;
        }
        const mod = getModifiableCSSDeclaration('background-color', value, null, null);
        if (mod) {
            modDecs.push(mod);
        }
    }
    if (element.hasAttribute('fill') && element instanceof SVGElement) {
        const SMALL_SVG_LIMIT = 32;
        let value = element.getAttribute('fill');
        let isBg = false;
        if (!(element instanceof SVGTextElement)) {
            const {width, height} = element.getBoundingClientRect();
            isBg = (width > SMALL_SVG_LIMIT || height > SMALL_SVG_LIMIT);
        }
        const mod = getModifiableCSSDeclaration(isBg ? 'background-color' : 'color', value, null, null);
        if (mod) {
            mod.property = 'fill';
            modDecs.push(mod);
        }
    }
    if (element.hasAttribute('stroke')) {
        let value = element.getAttribute('stroke');
        const mod = getModifiableCSSDeclaration(element instanceof SVGLineElement ? 'border-color' : 'color', value, null, null);
        if (mod) {
            mod.property = 'stroke';
            modDecs.push(mod);
        }
    }
    element.style && iterateCSSDeclarations(element.style, (property, value) => {
        // Temporaty ignore background images
        // due to possible performance issues
        // and complexity of handling async requests
        if (property === 'background-image' && value.indexOf('url') >= 0) {
            return;
        }
        const mod = getModifiableCSSDeclaration(property, value, null, null);
        if (mod) {
            modDecs.push(mod);
        }
    });
    if (element.style && element instanceof SVGTextElement && element.style.fill) {
        const mod = getModifiableCSSDeclaration('color', element.style.getPropertyValue('fill'), null, null);
        if (mod) {
            mod.property = 'fill'
            modDecs.push(mod);
        }
    }

    if (modDecs.length > 0) {
        const id = inlineStyleElementsIds.get(element);
        element.dataset[STORE] = id;
        const selector = `[${STORE_ATTR}="${id}"]`;
        const lines: string[] = [];
        lines.push(`${selector} {`);
        modDecs.forEach(({property, value}) => {
            const val = typeof value === 'function' ? value(filter) : value;
            if (val) {
                lines.push(`    ${property}: ${val} !important;`);
            }
        });
        lines.push('}');
        return lines.join('\n');
    }

    return null;
}
