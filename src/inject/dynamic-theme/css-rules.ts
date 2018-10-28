import {parseURL, getAbsoluteURL} from './url';
import {logWarn} from '../utils/log';

export function iterateCSSRules(rules: CSSRuleList, iterate: (rule: CSSStyleRule) => void) {
    Array.from<CSSRule>(rules as any)
        .forEach((rule) => {
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
            } else {
                logWarn(`CSSRule type not supported`, rule);
            }
        });
}

export function iterateCSSDeclarations(style: CSSStyleDeclaration, iterate: (property: string, value: string) => void) {
    Array.from(style).forEach((property) => {
        const value = style.getPropertyValue(property).trim();
        if (!value) {
            return;
        }
        iterate(property, value);
    });
}

export const cssURLRegex = /url\((('.+?')|(".+?")|([^\)]*?))\)/g;
export const cssImportRegex = /@import (url\()?(('.+?')|(".+?")|([^\)]*?))\)?;?/g;

export function getCSSURLValue(cssURL: string) {
    return cssURL.replace(/^url\((.*)\)$/, '$1').replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

export function getCSSBaseBath(url: string) {
    const cssURL = parseURL(url);
    return `${cssURL.protocol}//${cssURL.host}${cssURL.pathname.replace(/\?.*$/, '').replace(/(\/)([^\/]+)$/i, '$1')}`;
}

export function replaceCSSRelativeURLsWithAbsolute($css: string, cssBasePath: string) {
    return $css.replace(cssURLRegex, (match) => {
        const pathValue = getCSSURLValue(match);
        return `url("${getAbsoluteURL(cssBasePath, pathValue)}")`;
    });
}

const fontFaceRegex = /@font-face\s*{[^}]*}/g;

export function replaceCSSFontFace($css: string) {
    return $css.replace(fontFaceRegex, '');
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
            logWarn(`Variable ${name} not found`);
            missing = true;
        }
        return match;
    });
    if (missing) {
        return result;
    }
    if (result.match(varRegex)) {
        return replaceCSSVariables(result, variables);
    }
    return result;
}
