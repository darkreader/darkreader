import {forEach} from '../../utils/array';
import {isSafari} from '../../utils/platform';
import {parseURL, getAbsoluteURL} from '../../utils/url';
import {logInfo, logWarn} from '../utils/log';

export function iterateCSSRules(rules: CSSRuleList, iterate: (rule: CSSStyleRule) => void, onMediaRuleError?: () => void) {
    forEach(rules, (rule) => {
        // Don't rely on prototype or instanceof, they are slow implementations within the browsers.
        // However we can rely on certain properties to indentify which CSSRule we are dealing with.
        // And it's 2x so fast, https://jsben.ch/B0eLa
        if ((rule as CSSStyleRule).selectorText) {
            iterate((rule as CSSStyleRule));
        } else if ((rule as CSSImportRule).href) {
            try {
                iterateCSSRules((rule as CSSImportRule).styleSheet.cssRules, iterate, onMediaRuleError);
            } catch (err) {
                logInfo(`Found a non-loaded link.`);
                onMediaRuleError && onMediaRuleError();
            }
        } else if ((rule as CSSMediaRule).media) {
            const media = Array.from((rule as CSSMediaRule).media);
            const isScreenOrAll = media.some((m) => m.startsWith('screen') || m.startsWith('all'));
            const isPrintOrSpeech = media.some((m) => m.startsWith('print') || m.startsWith('speech'));

            if (isScreenOrAll || !isPrintOrSpeech) {
                iterateCSSRules((rule as CSSMediaRule).cssRules, iterate, onMediaRuleError);
            }
        } else if ((rule as CSSSupportsRule).conditionText) {
            if (CSS.supports((rule as CSSSupportsRule).conditionText)) {
                iterateCSSRules((rule as CSSSupportsRule).cssRules, iterate, onMediaRuleError);
            }
        } else {
            logWarn(`CSSRule type not supported`, rule);
        }
    });
}

// These properties are not iterable
// when they depend on variables
const shorthandVarDependantProperties = [
    'background',
    'border',
    'border-color',
    'border-bottom',
    'border-left',
    'border-right',
    'border-top',
    'outline',
    'outline-color',
];

const shorthandVarDepPropRegexps = isSafari ? shorthandVarDependantProperties.map((prop) => {
    const regexp = new RegExp(`${prop}:\\s*(.*?)\\s*;`);
    return [prop, regexp] as [string, RegExp];
}) : null;

export function iterateCSSDeclarations(style: CSSStyleDeclaration, iterate: (property: string, value: string) => void) {
    forEach(style, (property) => {
        const value = style.getPropertyValue(property).trim();
        if (!value) {
            return;
        }
        iterate(property, value);
    });

    // Bigger sites like gmail.com and google.com will love this optimization.
    // As a side-effect, styles with a lot of `var(` will notice a maximum slowdown of ~50ms.
    // Against the bigger sites that saves around ~150ms+ it's a good win.
    const cssText = style.cssText;
    if (cssText.includes('var(')) {
        if (isSafari) {
            // Safari doesn't show shorthand properties' values
            shorthandVarDepPropRegexps.forEach(([prop, regexp]) => {
                const match = cssText.match(regexp);
                if (match && match[1]) {
                    const val = match[1].trim();
                    iterate(prop, val);
                }
            });
        } else {
            shorthandVarDependantProperties.forEach((prop) => {
                const val = style.getPropertyValue(prop);
                if (val && val.includes('var(')) {
                    iterate(prop, val);
                }
            });
        }
    }
}

export const cssURLRegex = /url\((('.+?')|(".+?")|([^\)]*?))\)/g;
export const cssImportRegex = /@import\s*(url\()?(('.+?')|(".+?")|([^\)]*?))\)?;?/g;

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
