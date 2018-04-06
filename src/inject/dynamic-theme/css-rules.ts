import {getMatches, spinalToCamelCase} from '../../utils/text';

export function iterateCSSRules(iterator: (r: CSSStyleRule) => void) {
    Array.from(document.styleSheets)
        .filter((s) => {
            const node = s.ownerNode as HTMLStyleElement | HTMLLinkElement;
            if (node.id === 'dark-reader-style' || loadingStyles.has(node)) {
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

function parseURL(url: string) {
    const a = document.createElement('a');
    a.href = url;
    return a;
}

export const cssURLRegex = /url\((('.+?')|(".+?")|([^\)]*?))\)/g;

async function replaceCORSStyle(link: HTMLLinkElement) {
    const url = link.href;
    loadingStyles.add(link);

    link.disabled = true;
    const response = await fetch(url);
    const text = await response.text();

    // Replace relative paths with absolute
    const cssURL = parseURL(url);
    const cssBasePath = `${cssURL.protocol}//${cssURL.host}${cssURL.pathname.replace(/\/[^\/]+?\.css$/i, '')}`;
    const cssText = text.replace(cssURLRegex, (match, pathMatch: string) => {
        const pathValue = pathMatch.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
        if (!pathValue.match(/^.*?\/\//) && !pathValue.match(/^data\:/)) {
            const relativePath = pathValue.replace(/^\//, '');
            const baseParts = cssBasePath.split('/');
            const backwards = getMatches(/\.\.\//g, relativePath);
            const u = parseURL(`${baseParts.slice(0, baseParts.length - backwards.length).join('/')}/${relativePath.replace(/^(\.\.\/)*/, '')}`);
            return `url("${u.href}")`
        }
        return match;
    });

    const style = document.createElement('style');
    style.dataset.url = url;
    style.textContent = cssText;
    link.parentElement.insertBefore(style, link.nextElementSibling);
}
