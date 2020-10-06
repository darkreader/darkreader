import {forEach} from '../../utils/array';
import {parseURL, getAbsoluteURL} from './url';
import {logWarn} from '../utils/log';

export function iterateCSSRules(rules: CSSRuleList, iterate: (rule: CSSStyleRule) => void) {
    forEach(rules, (rule) => {
        if (rule instanceof CSSMediaRule) {
            const media = Array.from(rule.media);
            if (media.includes('screen') || media.includes('all') || !(media.includes('print') || media.includes('speech'))) {
                iterateCSSRules(rule.cssRules, iterate);
            }
        } else if (rule instanceof CSSStyleRule) {
            iterate(rule);
        } else if (rule instanceof CSSImportRule) {
            try {
                iterateCSSRules(rule.styleSheet.cssRules, iterate);
            } catch (err) {
                logWarn(err);
            }
        } else if (rule instanceof CSSSupportsRule) {
            if (CSS.supports(rule.conditionText)) {
                iterateCSSRules(rule.cssRules, iterate);
            }
        } else {
            logWarn(`CSSRule type not supported`, rule);
        }
    });
}

export function iterateCSSDeclarations(style: CSSStyleDeclaration, iterate: (property: string, value: string) => void) {
    forEach(style, (property) => {
        const value = style.getPropertyValue(property).trim();
        if (!value) {
            return;
        }
        iterate(property, value);
    });
}

function isCSSVariable(property: string) {
    return property.startsWith('--') && !property.startsWith('--darkreader');
}

export function getCSSVariables(rules: CSSRuleList) {
    const variables = new Map<string, string>();
    rules && iterateCSSRules(rules, (rule) => {
        rule.style && iterateCSSDeclarations(rule.style, (property, value) => {
            if (isCSSVariable(property)) {
                variables.set(property, value);
            }
        });
    });
    return variables;
}

export function getElementCSSVariables(element: HTMLElement) {
    const variables = new Map<string, string>();
    iterateCSSDeclarations(element.style, (property, value) => {
        if (isCSSVariable(property)) {
            variables.set(property, value);
        }
    });
    return variables;
}

export const cssURLRegex = /url\((('.+?')|(".+?")|([^\)]*?))\)/g;
export const cssImportRegex = /@import (url\()?(('.+?')|(".+?")|([^\)]*?))\)?;?/g;

export function getCSSURLValue(cssURL: string) {
    return cssURL.replace(/^url\((.*)\)$/, '$1').replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

export function getCSSBaseBath(url: string) {
    const cssURL = parseURL(url);
    return `${cssURL.origin}${cssURL.pathname.replace(/\?.*$/, '').replace(/(\/)([^\/]+)$/i, '$1')}`;
}

export function replaceCSSRelativeURLsWithAbsolute($css: string, cssBasePath: string) {
    return $css.replace(cssURLRegex, (match) => {
        const pathValue = getCSSURLValue(match);
        return `url("${getAbsoluteURL(cssBasePath, pathValue)}")`;
    });
}

const cssCommentsRegex = /\/\*[\s\S]*?\*\//g;

export function removeCSSComments($css: string) {
    return $css.replace(cssCommentsRegex, '');
}

const fontFaceRegex = /@font-face\s*{[^}]*}/g;

export function replaceCSSFontFace($css: string) {
    return $css.replace(fontFaceRegex, '');
}

const varRegex = /var\((--[^\s,\(\)]+),?\s*([^\(\)]*(\([^\(\)]*\)[^\(\)]*)*\s*)\)/g;

export function replaceCSSVariables(
    value: string,
    variables: Map<string, string>,
    stack = new Set<string>(),
) {
    let missing = false;
    const unresolvable = new Set<string>();
    const result = value.replace(varRegex, (match, name, fallback) => {
        if (stack.has(name)) {
            logWarn(`Circular reference to variable ${name}`);
            if (fallback) {
                return fallback;
            }
            missing = true;
            return match;
        }
        if (variables.has(name)) {
            const value = variables.get(name);
            if (value.match(varRegex)) {
                unresolvable.add(name);
            }
            return value;
        } else if (fallback) {
            return fallback;
        } else {
            logWarn(`Variable ${name} not found`);
            missing = true;
        }
        return match;
    });
    if (missing) {
        return result;
    }
    if (result.match(varRegex)) {
        unresolvable.forEach((v) => stack.add(v));
        return replaceCSSVariables(result, variables, stack);
    }
    return result;
}
