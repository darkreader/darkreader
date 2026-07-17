import {forEach} from '../../utils/array';
import {isLayerRuleSupported, isSafari} from '../../utils/platform';
import {escapeRegExpSpecialChars} from '../../utils/text';
import {parseURL, getAbsoluteURL} from '../../utils/url';
import {logInfo, logWarn} from '../utils/log';

export function iterateCSSRules(
    rules: CSSRuleList | CSSRule[] | Set<CSSRule>,
    iterate: (rule: CSSStyleRule) => void,
    onImportError?: () => void,
    importedSheets = new Set<CSSStyleSheet>()
): void {
    forEach(rules, (rule) => {
        if (isStyleRule(rule)) {
            iterate(rule);
            if (rule.cssRules?.length > 0) {
                iterateCSSRules(rule.cssRules, iterate, onImportError, importedSheets);
            }
        } else if (isImportRule(rule)) {
            try {
                const importedSheet = rule.styleSheet!;
                if (!importedSheets.has(importedSheet)) {
                    importedSheets.add(importedSheet);
                    iterateCSSRules(importedSheet.cssRules, iterate, onImportError, importedSheets);
                }
            } catch (err) {
                logInfo(`Found a non-loaded link.`);
                onImportError?.();
            }
        } else if (isMediaRule(rule)) {
            const media = Array.from(rule.media);
            const isScreenOrAllOrQuery = media.some((m) => m.startsWith('screen') || m.startsWith('all') || m.startsWith('('));
            const isNotScreen = !isScreenOrAllOrQuery && media.some((m) => ignoredMedia.some((i) => m.startsWith(i)));

            if (isScreenOrAllOrQuery || !isNotScreen) {
                iterateCSSRules(rule.cssRules, iterate, onImportError, importedSheets);
            }
        } else if (isSupportsRule(rule)) {
            if (CSS.supports(rule.conditionText)) {
                iterateCSSRules(rule.cssRules, iterate, onImportError, importedSheets);
            }
        } else if (isLayerRule(rule)) {
            iterateCSSRules(rule.cssRules, iterate, onImportError, importedSheets);
        } else {
            logWarn(`CSSRule type not supported`, rule);
        }
    });
}

export const ignoredMedia = [
    'aural',
    'braille',
    'embossed',
    'handheld',
    'print',
    'projection',
    'speech',
    'tty',
    'tv',
];

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
    const cssText = style.cssText;
    // 1 Better CSS variable detection - handles spaces and multiple vars
    // Changed from simple string.includes('var(') to regex that checks for actual CSS custom properties
    if (/var\s*\(\s*--/.test(cssText)) {
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
                if (val && /var\s*\(\s*--/.test(val)) {
                    iterate(prop, val);
                }
            });
        }
    }

    if (
        (
            cssText.includes('background-color: ;') ||
            cssText.includes('background-image: ;')
        ) && !style.getPropertyValue('background')
    ) {
        handleEmptyShorthand('background', style, iterate);
    }
    if (cssText.includes('border-') && cssText.includes('-color: ;') && !style.getPropertyValue('border')) {
        handleEmptyShorthand('border', style, iterate);
    }

    forEach(style, (property) => {
        const value = style.getPropertyValue(property).trim();
        if (!value) {
            return;
        }
        iterate(property, value);
    });
}

// `rule.cssText` fails when the rule has both
// `background: var()` and `background-*`.
// This fix retrieves the source value from CSS text,
// but will only work for <style> elements and
// there is a chance of multiple matches.
// https://issues.chromium.org/issues/40252592
// 2 Use non-greedy regex to prevent matching across multiple CSS rules
function handleEmptyShorthand(shorthand: string, style: CSSStyleDeclaration, iterate: (property: string, value: string) => void) {
    const parentRule = style.parentRule;
    if (isStyleRule(parentRule)) {
        const sourceCSSText = parentRule.parentStyleSheet?.ownerNode?.textContent;
        if (sourceCSSText) {
            let escapedSelector = escapeRegExpSpecialChars(parentRule.selectorText);
            escapedSelector = escapedSelector.replaceAll(/\s+/g, '\\s*'); // Space count can differ
            escapedSelector = escapedSelector.replaceAll(/::/g, '::?'); // ::before can be :before
            // Non-greedy [^}]*? to match only until first closing brace (not across multiple rules)
            const regexp = new RegExp(`${escapedSelector}\\s*{[^}]*?${shorthand}:\\s*([^;}]+)`, 'i');
            const match = sourceCSSText.match(regexp);
            if (match) {
                iterate(shorthand, match[1].trim());
            }
        } else if (shorthand === 'background') {
            iterate('background-color', '#ffffff');
            iterate('background-image', 'none');
        }
    }
}

export const cssURLRegex = /url\((('.*?')|(".*?")|([^\)]*?))\)/g;
export const cssImportRegex = /@import\s*(url\()?(('.+?')|(".+?")|([^\)]*?))\)? ?(screen)?;?/gi;

// 3: Handle data URIs with parentheses and complex URLs correctly
// First try to extract the CSS URL value. Then do some post fixes, like unescaping
// backslashes in the URL. (Chromium don't handle this natively). Remove all newlines
// beforehand, otherwise `.` will fail matching the content within the url, as it
// doesn't match any linebreaks.
export function getCSSURLValue(cssURL: string): string {
    let cleaned = cssURL.trim().replace(/[\n\r]+/g, '');
    
    // Handle data URIs separately to preserve internal parentheses
    // Data URIs can contain unescaped parens: url(data:image/svg+xml;utf8,<svg></svg>)
    if (cleaned.includes('data:')) {
        // Use non-greedy match for data URIs to handle nested parens correctly
        const dataMatch = cleaned.match(/^url\(['"]?(data:[^'"]*?)['"]?\)$/i);
        if (dataMatch) {
            return dataMatch[1];
        }
    }
    
    // Regular URLs: remove url() wrapper and quotes
    // Handle escaped characters and clean up the URL
    cleaned = cleaned
        .replace(/^url\(['"]?/, '')
        .replace(/['"]?\)$/, '')
        .trim()
        .replace(/^"(.*)"$/, '$1')
        .replace(/^'(.*)'$/, '$1')
        .replace(/\\(.)/g, '$1');
    
    return cleaned;
}

export function getCSSBaseBath(url: string): string {
    const cssURL = parseURL(url);
    return `${cssURL.origin}${cssURL.pathname.replace(/\?.*$/, '').replace(/(\/)([^\/]+)$/i, '$1')}`;
}

export function replaceCSSRelativeURLsWithAbsolute($css: string, cssBasePath: string): string {
    return $css.replace(cssURLRegex, (match) => {
        try {
            const url = getCSSURLValue(match);
            const absoluteURL = getAbsoluteURL(cssBasePath, url);
            const escapedURL = absoluteURL.replaceAll('\'', '\\\'');
            return `url('${escapedURL}')`;
        } catch (err) {
            logWarn('Not able to replace relative URL with Absolute URL, skipping');
            return match;
        }
    });
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

// 4: Simplified type guard - removed redundant cross-checks
export function isImportRule(rule: CSSRule | null): rule is CSSImportRule {
    if (!rule) {
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
    if (supportsRules.has(rule)) {
        return true;
    }
    if (rule instanceof CSSSupportsRule) {
        supportsRules.add(rule);
        return true;
    }
    return false;
}

export function isLayerRule(rule: CSSRule | null): rule is CSSLayerBlockRule {
    if (!rule) {
        return false;
    }
    if (layerRules.has(rule)) {
        return true;
    }
    if (isLayerRuleSupported && rule instanceof CSSLayerBlockRule) {
        layerRules.add(rule);
        return true;
    }
    return false;
}
