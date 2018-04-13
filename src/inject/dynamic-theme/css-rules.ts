import {parseURL} from './url';

export function iterateCSSRules(options: {filter: (s: StyleSheet) => boolean, iterate: (r: CSSStyleRule) => void}) {
    Array.from(document.styleSheets)
        .filter((s) => {
            try {
                return Boolean((s as any).cssRules);
            } catch (err) {
                return false;
            }
        })
        .filter((s) => options.filter(s))
        .forEach((s) => {
            Array.from<CSSStyleRule>((s as any).cssRules)
                .forEach((r) => {
                    if (r instanceof CSSMediaRule) {
                        Array.from(r.cssRules).forEach((mr) => options.iterate(mr as CSSStyleRule));
                    } else {
                        options.iterate(r);
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
        const value = declarations.getPropertyValue(property).trim();
        if (!value) {
            return;
        }
        iterator(property, value);
    });
}

export const cssURLRegex = /url\((('.+?')|(".+?")|([^\)]*?))\)/g;
export const fontFaceRegex = /@font-face\s*{[^}]*}/g;

export function getCSSURLValue(cssURL: string) {
    return cssURL.replace(/^url\((.*)\)$/, '$1').replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

export function getCSSBaseBath(url: string) {
    const cssURL = parseURL(url);
    return `${cssURL.protocol}//${cssURL.host}${cssURL.pathname.replace(/\/[^\/]+?\.css$/i, '')}`;
}

const varRegex = /var\((--[^\s,]+),?\s*([^\(\)]*(\([^\(\)]*\)[^\(\)]*)*\s*)\)/g;

export function replaceCSSVariables(value: string, variables: Map<string, string>) {
    let missing = false;
    const result = value.replace(varRegex, (match, name, fallback) => {
        if (variables.has(name)) {
            return variables.get(name);
        } else if (fallback) {
            return fallback;
        } else {
            missing = true;
        }
        return match;
    });
    if (missing) {
        return null;
    }
    return result;
}
