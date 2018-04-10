import {spinalToCamelCase} from '../../utils/text';
import {parseURL, getAbsoluteURL} from './url';

export function iterateCSSRules(iterator: (r: CSSStyleRule) => void) {
    Array.from(document.styleSheets)
        .filter((s) => {
            const node = s.ownerNode as HTMLStyleElement | HTMLLinkElement;
            if (node.id === 'dark-reader-style' ||
                loadingStyles.has(node) ||
                node.classList.contains('dark-reader-style--async')
            ) {
                return false;
            }

            let hasRules = false;
            try {
                hasRules = Boolean((s as any).cssRules);
            } catch (err) {
                console.warn(err);
                if (node instanceof HTMLLinkElement) {
                    replaceCORSStyle(node);
                }
            }
            return hasRules;
        })
        .forEach((s) => {
            Array.from<CSSStyleRule>((s as any).cssRules)
                .forEach((r) => {
                    if (r instanceof CSSMediaRule) {
                        Array.from(r.cssRules).forEach((mr) => iterator(mr as CSSStyleRule));
                    } else {
                        iterator(r);
                    }
                });
        });
}

export function iterateCSSDeclarations(rule: CSSStyleRule, iterator: (propery: string, value: string) => void) {
    const declarations = rule.style;
    if (!declarations) {
        return;
    }
    Array.from(declarations).forEach((property) => {
        const jsProp = spinalToCamelCase(property);
        const value = declarations[jsProp];
        if (!value) {
            return;
        }
        iterator(property, value);
    });
}

const loadingStyles = new WeakSet<Node>();

export const cssURLRegex = /url\((('.+?')|(".+?")|([^\)]*?))\)/g;

export function getCSSURLValue(cssURL: string) {
    return cssURL.replace(/^url\((.*)\)$/, '$1').replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

export function getCSSBaseBath(url: string) {
    const cssURL = parseURL(url);
    return `${cssURL.protocol}//${cssURL.host}${cssURL.pathname.replace(/\/[^\/]+?\.css$/i, '')}`;
}

async function replaceCORSStyle(link: HTMLLinkElement) {
    const url = link.href;
    loadingStyles.add(link);

    link.disabled = true;
    const response = await fetch(url);
    const text = await response.text();

    // Replace relative paths with absolute
    const cssBasePath = getCSSBaseBath(url);
    const cssText = text.replace(cssURLRegex, (match) => {
        const pathValue = getCSSURLValue(match);
        return `url("${getAbsoluteURL(cssBasePath, pathValue)}")`;
    });

    const style = document.createElement('style');
    style.dataset.url = url;
    style.textContent = cssText;
    link.parentElement.insertBefore(style, link.nextElementSibling);
}
