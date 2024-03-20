import {forEach} from '../../utils/array';
import {formatParsedCSS} from '../../utils/format/css';
import {isParsedStyleRule, parseCSS} from '../../utils/parse/css';
import type {ParsedCSS} from '../../utils/parse/css';
import {isSafari} from '../../utils/platform';
import {parseURL, getAbsoluteURL} from '../../utils/url';
import {logInfo, logWarn} from '../utils/log';

export function iterateCSSRules(rules: CSSRuleList | CSSRule[], iterate: (rule: CSSStyleRule) => void, onImportError?: () => void): void {
    forEach(rules, (rule) => {
        if (isStyleRule(rule)) {
            iterate(rule);
        } else if (isImportRule(rule)) {
            try {
                iterateCSSRules(rule.styleSheet!.cssRules, iterate, onImportError);
            } catch (err) {
                logInfo(`Found a non-loaded link.`);
                onImportError?.();
            }
        } else if (isMediaRule(rule)) {
            const media = Array.from(rule.media);
            const isScreenOrAllOrQuery = media.some((m) => m.startsWith('screen') || m.startsWith('all') || m.startsWith('('));
            const isPrintOrSpeech = media.some((m) => m.startsWith('print') || m.startsWith('speech'));

            if (isScreenOrAllOrQuery || !isPrintOrSpeech) {
                iterateCSSRules(rule.cssRules, iterate, onImportError);
            }
        } else if (isSupportsRule(rule)) {
            if (CSS.supports(rule.conditionText)) {
                iterateCSSRules(rule.cssRules, iterate, onImportError);
            }
        } else if (isLayerRule(rule)) {
            iterateCSSRules(rule.cssRules, iterate, onImportError);
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

const styleRules = new WeakSet<CSSRule>();
const importRules = new WeakSet<CSSRule>();
const mediaRules = new WeakSet<CSSRule>();
const supportsRules = new WeakSet<CSSRule>();
const layerRules = new WeakSet<CSSRule>();

export function isStyleRule(rule: CSSRule | null): rule is CSSStyleRule {
    if (!rule) {
        return false;
    }
    if (styleRules.has(rule)) {
        return true;
    }
    // Duck typing is faster than instanceof
    // https://jsben.ch/B0eLa
    if ((rule as CSSStyleRule).selectorText) {
        styleRules.add(rule);
        return true;
    }
    return false;
}

export function isImportRule(rule: CSSRule | null): rule is CSSImportRule {
    if (!rule) {
        return false;
    }
    if (styleRules.has(rule)) {
        return false;
    }
    if (importRules.has(rule)) {
        return true;
    }
    if ((rule as CSSImportRule).href) {
        importRules.add(rule);
        return true;
    }
    return false;
}

export function isMediaRule(rule: CSSRule | null): rule is CSSMediaRule {
    if (!rule) {
        return false;
    }
    if (styleRules.has(rule)) {
        return false;
    }
    if (mediaRules.has(rule)) {
        return true;
    }
    if ((rule as CSSMediaRule).media) {
        mediaRules.add(rule);
        return true;
    }
    return false;
}

export function isSupportsRule(rule: CSSRule | null): rule is CSSSupportsRule {
    if (!rule) {
        return false;
    }
    if (styleRules.has(rule)) {
        return false;
    }
    if (supportsRules.has(rule)) {
        return true;
    }
    if (rule.cssText.startsWith('@supports')) {
        supportsRules.add(rule);
        return true;
    }
    return false;
}

export function isLayerRule(rule: CSSRule | null): rule is CSSLayerBlockRule {
    if (!rule) {
        return false;
    }
    if (styleRules.has(rule)) {
        return false;
    }
    if (layerRules.has(rule)) {
        return true;
    }
    if (rule.cssText.startsWith('@layer') && (rule as CSSLayerBlockRule).cssRules) {
        layerRules.add(rule);
        return true;
    }
    return false;
}

// `rule.cssText` fails when the rule has both
// `background: var()` and `background-*`.
// This fix moves `background: var()` declarations
// into separate rules with the same selector.
// https://issues.chromium.org/issues/40252592
export function fixShorthandVarProps<T extends CSSRuleList | CSSRule[]>(rules: T): T {
    if (!(rules instanceof CSSRuleList) || rules.length === 0 || !rules[0].parentStyleSheet) {
        return rules;
    }

    const sheet = rules[0].parentStyleSheet;
    const owner = sheet && sheet.ownerNode;
    if (!owner || !(owner instanceof HTMLStyleElement)) {
        return rules;
    }

    const cssText = owner.textContent;
    if (!cssText?.includes('var(') || !cssText.match(/background:\s*var\(/)) {
        return rules;
    }

    try {
        const sheet = new CSSStyleSheet();
        const parsed = parseCSS(cssText);
        splitShorthandParsedProps(parsed);
        const fixedCSSText = formatParsedCSS(parsed);
        sheet.replaceSync(fixedCSSText);
        if (sheet.cssRules) {
            return sheet.cssRules as T;
        }
    } catch (err) {
        logWarn(err);
    }
    return rules;
}

function splitShorthandParsedProps(parsed: ParsedCSS) {
    for (let i = parsed.length - 1; i >= 0; i--) {
        const rule = parsed[i];
        if (!isParsedStyleRule(rule)) {
            splitShorthandParsedProps(rule.rules);
            continue;
        }
        const backgroundIndex = rule.declarations.findIndex((d) => d.property === 'background' && d.value.startsWith('var('));
        if (backgroundIndex < 0) {
            continue;
        }
        const hasOtherBackground = rule.declarations.some((d) => d.property.startsWith('background-'));
        if (!hasOtherBackground) {
            continue;
        }
        parsed.splice(i, 0, {
            selectors: rule.selectors,
            declarations: [
                rule.declarations[backgroundIndex],
            ],
        });
        rule.declarations.splice(backgroundIndex, 1);
    }
}
