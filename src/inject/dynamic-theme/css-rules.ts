import {forEach} from '../../utils/array';
import {isSafari} from '../../utils/platform';
import {parseURL, getAbsoluteURL} from '../../utils/url';
import {logInfo, logWarn} from '../utils/log';

export function iterateCSSRules(rules: CSSRuleList, iterate: (rule: CSSStyleRule) => void, onMediaRuleError?: () => void): void {
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
            const isScreenOrAllOrQuery = media.some((m) => m.startsWith('screen') || m.startsWith('all') || m.startsWith('('));
            const isPrintOrSpeech = media.some((m) => m.startsWith('print') || m.startsWith('speech'));

            if (isScreenOrAllOrQuery || !isPrintOrSpeech) {
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

export function iterateCSSDeclarations(style: CSSStyleDeclaration, iterate: (property: string, value: string) => void): void {
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
            shorthandVarDepPropRegexps!.forEach(([prop, regexp]) => {
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

export const cssURLRegex = /url\((('.*?')|(".*?")|([^\)]*?))\)/g;
export const cssImportRegex = /@import\s*(url\()?(('.+?')|(".+?")|([^\)]*?))\)? ?(screen)?;?/gi;

// First try to extract the CSS URL value. Then do some post fixes, like unescaping
// backslashes in the URL. (Chromium don't handle this natively). Remove all newlines
// beforehand, otherwise `.` will fail matching the content within the url, as it
// doesn't match any linebreaks.
export function getCSSURLValue(cssURL: string): string {
    return cssURL.trim().replace(/[\n\r\\]+/g, '').replace(/^url\((.*)\)$/, '$1').trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').replace(/(?:\\(.))/g, '$1');
}

export function getCSSBaseBath(url: string): string {
    const cssURL = parseURL(url);
    return `${cssURL.origin}${cssURL.pathname.replace(/\?.*$/, '').replace(/(\/)([^\/]+)$/i, '$1')}`;
}

export function replaceCSSRelativeURLsWithAbsolute($css: string, cssBasePath: string): string {
    return $css.replace(cssURLRegex, (match) => {
        const pathValue = getCSSURLValue(match);
        // Sites can have any kind of specified URL, thus also invalid ones.
        // To prevent the whole operation from failing, let's just skip those
        // invalid URL's and let them be invalid.
        try {
            return `url('${getAbsoluteURL(cssBasePath, pathValue)}')`;
        } catch (err) {
            logWarn('Not able to replace relative URL with Absolute URL, skipping');
            return match;
        }
    });
}

const cssCommentsRegex = /\/\*[\s\S]*?\*\//g;

export function removeCSSComments($css: string): string {
    return $css.replace(cssCommentsRegex, '');
}

const fontFaceRegex = /@font-face\s*{[^}]*}/g;

export function replaceCSSFontFace($css: string): string {
    return $css.replace(fontFaceRegex, '');
}
