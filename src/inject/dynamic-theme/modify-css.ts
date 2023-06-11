import {parseColorWithCache, rgbToHSL, hslToString} from '../../utils/color';
import {clamp} from '../../utils/math';
import {getMatches} from '../../utils/text';
import {getAbsoluteURL} from '../../utils/url';
import {modifyBackgroundColor, modifyBorderColor, modifyForegroundColor, modifyGradientColor, modifyShadowColor, clearColorModificationCache} from '../../generators/modify-colors';
import {cssURLRegex, getCSSURLValue, getCSSBaseBath} from './css-rules';
import type {ImageDetails} from './image';
import {getImageDetails, getFilteredImageDataURL, cleanImageProcessingCache} from './image';
import type {CSSVariableModifier, VariablesStore} from './variables';
import {logWarn, logInfo} from '../utils/log';
import type {FilterConfig, Theme} from '../../definitions';
import {isFirefox, isCSSColorSchemePropSupported} from '../../utils/platform';
import type {parsedGradient} from '../../utils/parsing';
import {parseGradient} from '../../utils/parsing';

declare const __CHROMIUM_MV3__: boolean;

export type CSSValueModifier = (theme: Theme) => string | Promise<string | null>;

export interface CSSValueModifierResult {
    result: string;
    matchesLength: number;
    unparseableMatchesLength: number;
}

export type CSSValueModifierWithInfo = (theme: Theme) => CSSValueModifierResult;

export interface ModifiableCSSDeclaration {
    property: string;
    value: string | CSSValueModifier | CSSVariableModifier;
    important: boolean;
    sourceValue: string;
}

export interface ModifiableCSSRule {
    selector: string;
    parentRule: CSSRule;
    declarations: ModifiableCSSDeclaration[];
}

function getPriority(ruleStyle: CSSStyleDeclaration, property: string) {
    return Boolean(ruleStyle && ruleStyle.getPropertyPriority(property));
}

export function getModifiableCSSDeclaration(
    property: string,
    value: string,
    rule: CSSStyleRule,
    variablesStore: VariablesStore,
    ignoreImageSelectors: string[],
    isCancelled: (() => boolean) | null,
): ModifiableCSSDeclaration | null {
    if (property.startsWith('--')) {
        const modifier = getVariableModifier(variablesStore, property, value, rule, ignoreImageSelectors, isCancelled!);
        if (modifier) {
            return {property, value: modifier, important: getPriority(rule.style, property), sourceValue: value};
        }
    } else if (value.includes('var(')) {
        const modifier = getVariableDependantModifier(variablesStore, property, value);
        if (modifier) {
            return {property, value: modifier, important: getPriority(rule.style, property), sourceValue: value};
        }
    } else if (property === 'color-scheme') {
        // Note: this if statement needs to be above the next one
        logWarn('CSS property color-scheme is not supported');
        return null;
    } else if (
        (property.includes('color') && property !== '-webkit-print-color-adjust') ||
        property === 'fill' ||
        property === 'stroke' ||
        property === 'stop-color'
    ) {
        const modifier = getColorModifier(property, value, rule);
        if (modifier) {
            return {property, value: modifier, important: getPriority(rule.style, property), sourceValue: value};
        }
    } else if (property === 'background-image' || property === 'list-style-image') {
        const modifier = getBgImageModifier(value, rule, ignoreImageSelectors, isCancelled!);
        if (modifier) {
            return {property, value: modifier, important: getPriority(rule.style, property), sourceValue: value};
        }
    } else if (property.includes('shadow')) {
        const modifier = getShadowModifier(value);
        if (modifier) {
            return {property, value: modifier, important: getPriority(rule.style, property), sourceValue: value};
        }
    }
    return null;
}

function joinSelectors(...selectors: string[]) {
    return selectors.filter(Boolean).join(', ');
}

export function getModifiedUserAgentStyle(theme: Theme, isIFrame: boolean, styleSystemControls: boolean): string {
    const lines: string[] = [];
    if (!isIFrame) {
        lines.push('html {');
        lines.push(`    background-color: ${modifyBackgroundColor({r: 255, g: 255, b: 255}, theme)} !important;`);
        lines.push('}');
    }
    if (__CHROMIUM_MV3__ || isCSSColorSchemePropSupported) {
        lines.push('html {');
        lines.push(`    color-scheme: ${theme.mode === 1 ? 'dark' : 'dark light'} !important;`);
        lines.push('}');
    }
    const bgSelectors = joinSelectors(isIFrame ? '' : 'html, body', styleSystemControls ? 'input, textarea, select, button, dialog' : '');
    if (bgSelectors) {
        lines.push(`${bgSelectors} {`);
        lines.push(`    background-color: ${modifyBackgroundColor({r: 255, g: 255, b: 255}, theme)};`);
        lines.push('}');
    }
    lines.push(`${joinSelectors('html, body', styleSystemControls ? 'input, textarea, select, button' : '')} {`);
    lines.push(`    border-color: ${modifyBorderColor({r: 76, g: 76, b: 76}, theme)};`);
    lines.push(`    color: ${modifyForegroundColor({r: 0, g: 0, b: 0}, theme)};`);
    lines.push('}');
    lines.push('a {');
    lines.push(`    color: ${modifyForegroundColor({r: 0, g: 64, b: 255}, theme)};`);
    lines.push('}');
    lines.push('table {');
    lines.push(`    border-color: ${modifyBorderColor({r: 128, g: 128, b: 128}, theme)};`);
    lines.push('}');
    lines.push('::placeholder {');
    lines.push(`    color: ${modifyForegroundColor({r: 169, g: 169, b: 169}, theme)};`);
    lines.push('}');
    lines.push('input:-webkit-autofill,');
    lines.push('textarea:-webkit-autofill,');
    lines.push('select:-webkit-autofill {');
    lines.push(`    background-color: ${modifyBackgroundColor({r: 250, g: 255, b: 189}, theme)} !important;`);
    lines.push(`    color: ${modifyForegroundColor({r: 0, g: 0, b: 0}, theme)} !important;`);
    lines.push('}');
    if (theme.scrollbarColor) {
        lines.push(getModifiedScrollbarStyle(theme));
    }
    if (theme.selectionColor) {
        lines.push(getModifiedSelectionStyle(theme));
    }
    return lines.join('\n');
}

export function getSelectionColor(theme: Theme): {backgroundColorSelection: string; foregroundColorSelection: string} {
    let backgroundColorSelection: string;
    let foregroundColorSelection: string;
    if (theme.selectionColor === 'auto') {
        backgroundColorSelection = modifyBackgroundColor({r: 0, g: 96, b: 212}, {...theme, grayscale: 0});
        foregroundColorSelection = modifyForegroundColor({r: 255, g: 255, b: 255}, {...theme, grayscale: 0});
    } else {
        const rgb = parseColorWithCache(theme.selectionColor)!;
        const hsl = rgbToHSL(rgb);
        backgroundColorSelection = theme.selectionColor;
        if (hsl.l < 0.5) {
            foregroundColorSelection = '#FFF';
        } else {
            foregroundColorSelection = '#000';
        }
    }
    return {backgroundColorSelection, foregroundColorSelection};
}

function getModifiedSelectionStyle(theme: Theme) {
    const lines: string[] = [];
    const modifiedSelectionColor = getSelectionColor(theme);
    const backgroundColorSelection = modifiedSelectionColor.backgroundColorSelection;
    const foregroundColorSelection = modifiedSelectionColor.foregroundColorSelection;
    ['::selection', '::-moz-selection'].forEach((selection) => {
        lines.push(`${selection} {`);
        lines.push(`    background-color: ${backgroundColorSelection} !important;`);
        lines.push(`    color: ${foregroundColorSelection} !important;`);
        lines.push('}');
    });
    return lines.join('\n');
}

function getModifiedScrollbarStyle(theme: Theme) {
    const lines: string[] = [];
    let colorTrack: string;
    let colorIcons: string;
    let colorThumb: string;
    let colorThumbHover: string;
    let colorThumbActive: string;
    let colorCorner: string;
    if (theme.scrollbarColor === 'auto') {
        colorTrack = modifyBackgroundColor({r: 241, g: 241, b: 241}, theme);
        colorIcons = modifyForegroundColor({r: 96, g: 96, b: 96}, theme);
        colorThumb = modifyBackgroundColor({r: 176, g: 176, b: 176}, theme);
        colorThumbHover = modifyBackgroundColor({r: 144, g: 144, b: 144}, theme);
        colorThumbActive = modifyBackgroundColor({r: 96, g: 96, b: 96}, theme);
        colorCorner = modifyBackgroundColor({r: 255, g: 255, b: 255}, theme);
    } else {
        const rgb = parseColorWithCache(theme.scrollbarColor)!;
        const hsl = rgbToHSL(rgb);
        const isLight = hsl.l > 0.5;
        const lighten = (lighter: number) => ({...hsl, l: clamp(hsl.l + lighter, 0, 1)});
        const darken = (darker: number) => ({...hsl, l: clamp(hsl.l - darker, 0, 1)});
        colorTrack = hslToString(darken(0.4));
        colorIcons = hslToString(isLight ? darken(0.4) : lighten(0.4));
        colorThumb = hslToString(hsl);
        colorThumbHover = hslToString(lighten(0.1));
        colorThumbActive = hslToString(lighten(0.2));
        colorCorner = hslToString(darken(0.5));
    }
    lines.push('::-webkit-scrollbar {');
    lines.push(`    background-color: ${colorTrack};`);
    lines.push(`    color: ${colorIcons};`);
    lines.push('}');
    lines.push('::-webkit-scrollbar-thumb {');
    lines.push(`    background-color: ${colorThumb};`);
    lines.push('}');
    lines.push('::-webkit-scrollbar-thumb:hover {');
    lines.push(`    background-color: ${colorThumbHover};`);
    lines.push('}');
    lines.push('::-webkit-scrollbar-thumb:active {');
    lines.push(`    background-color: ${colorThumbActive};`);
    lines.push('}');
    lines.push('::-webkit-scrollbar-corner {');
    lines.push(`    background-color: ${colorCorner};`);
    lines.push('}');
    if (isFirefox) {
        lines.push('* {');
        lines.push(`    scrollbar-color: ${colorThumb} ${colorTrack};`);
        lines.push('}');
    }
    return lines.join('\n');
}

export function getModifiedFallbackStyle(filter: FilterConfig, {strict}: {strict: boolean}): string {
    const lines: string[] = [];
    // https://github.com/darkreader/darkreader/issues/3618#issuecomment-895477598
    const isMicrosoft = ['microsoft.com', 'docs.microsoft.com'].includes(location.hostname);
    lines.push(`html, body, ${strict ? `body :not(iframe)${isMicrosoft ? ':not(div[style^="position:absolute;top:0;left:-"]' : ''}` : 'body > :not(iframe)'} {`);
    lines.push(`    background-color: ${modifyBackgroundColor({r: 255, g: 255, b: 255}, filter)} !important;`);
    lines.push(`    border-color: ${modifyBorderColor({r: 64, g: 64, b: 64}, filter)} !important;`);
    lines.push(`    color: ${modifyForegroundColor({r: 0, g: 0, b: 0}, filter)} !important;`);
    lines.push('}');
    return lines.join('\n');
}

const unparsableColors = new Set([
    'inherit',
    'transparent',
    'initial',
    'currentcolor',
    'none',
    'unset',
]);

function getColorModifier(prop: string, value: string, rule: CSSStyleRule): string | CSSValueModifier | null {
    if (unparsableColors.has(value.toLowerCase())) {
        return value;
    }
    const rgb = parseColorWithCache(value);
    if (!rgb) {
        logWarn("Couldn't parse color", value);
        return null;
    }

    if (prop.includes('background')) {
        if (
            (rule.style.webkitMaskImage && rule.style.webkitMaskImage !== 'none') ||
            (rule.style.webkitMask && !rule.style.webkitMask.startsWith('none')) ||
            (rule.style.mask && rule.style.mask !== 'none') ||
            (rule.style.getPropertyValue('mask-image') && rule.style.getPropertyValue('mask-image') !== 'none')
        ) {
            return (filter) => modifyForegroundColor(rgb, filter);
        }
        return (filter) => modifyBackgroundColor(rgb, filter);
    }
    if (prop.includes('border') || prop.includes('outline')) {
        return (filter) => modifyBorderColor(rgb, filter);
    }
    return (filter) => modifyForegroundColor(rgb, filter);
}

const imageDetailsCache = new Map<string, ImageDetails>();
const awaitingForImageLoading = new Map<string, Array<(imageDetails: ImageDetails | null) => void>>();

function shouldIgnoreImage(selectorText: string, selectors: string[]) {
    if (!selectorText || selectors.length === 0) {
        return false;
    }
    if (selectors.some((s) => s === '*')) {
        return true;
    }
    const ruleSelectors = selectorText.split(/,\s*/g);
    for (let i = 0; i < selectors.length; i++) {
        const ignoredSelector = selectors[i];
        if (ruleSelectors.some((s) => s === ignoredSelector)) {
            return true;
        }
    }
    return false;
}

interface bgImageMatches {
    type: 'url' | 'gradient';
    index: number;
    match: string;
    offset: number;
    typeGradient?: string;
    hasComma?: boolean;
}

export function getBgImageModifier(
    value: string,
    rule: CSSStyleRule,
    ignoreImageSelectors: string[],
    isCancelled: () => boolean,
): string | CSSValueModifier | null {
    try {
        const gradients = parseGradient(value);
        const urls = getMatches(cssURLRegex, value);

        if (urls.length === 0 && gradients.length === 0) {
            return value;
        }

        const getIndices = (matches: string[]) => {
            let index = 0;
            return matches.map((match) => {
                const valueIndex = value.indexOf(match, index);
                index = valueIndex + match.length;
                return {match, index: valueIndex};
            });
        };

        const matches: bgImageMatches[] =
            (gradients.map((i) => ({type: 'gradient', ...i})) as bgImageMatches[])
                .concat(getIndices(urls).map((i) => ({type: 'url', offset: 0, ...i})))
                .sort((a, b) => a.index > b.index ? 1 : -1);

        const getGradientModifier = (gradient: parsedGradient) => {
            const {typeGradient, match, hasComma} = gradient;

            const partsRegex = /([^\(\),]+(\([^\(\)]*(\([^\(\)]*\)*[^\(\)]*)?\))?([^\(\), ]|( (?!calc)))*),?/g;
            const colorStopRegex = /^(from|color-stop|to)\(([^\(\)]*?,\s*)?(.*?)\)$/;

            const parts = getMatches(partsRegex, match, 1).map((part) => {
                part = part.trim();

                let rgb = parseColorWithCache(part);
                if (rgb) {
                    return (filter: FilterConfig) => modifyGradientColor(rgb!, filter);
                }

                const space = part.lastIndexOf(' ');
                rgb = parseColorWithCache(part.substring(0, space));
                if (rgb) {
                    return (filter: FilterConfig) => `${modifyGradientColor(rgb!, filter)} ${part.substring(space + 1)}`;
                }

                const colorStopMatch = part.match(colorStopRegex);
                if (colorStopMatch) {
                    rgb = parseColorWithCache(colorStopMatch[3]);
                    if (rgb) {
                        return (filter: FilterConfig) => `${colorStopMatch[1]}(${colorStopMatch[2] ? `${colorStopMatch[2]}, ` : ''}${modifyGradientColor(rgb!, filter)})`;
                    }
                }

                return () => part;
            });

            return (filter: FilterConfig) => {
                return `${typeGradient}(${parts.map((modify) => modify(filter)).join(', ')})${hasComma ? ', ' : ''}`;
            };
        };

        const getURLModifier = (urlValue: string) => {
            if (shouldIgnoreImage(rule.selectorText, ignoreImageSelectors)) {
                return null;
            }
            let url = getCSSURLValue(urlValue);
            const isURLEmpty = url.length === 0;
            const {parentStyleSheet} = rule;
            const baseURL = (parentStyleSheet && parentStyleSheet.href) ?
                getCSSBaseBath(parentStyleSheet.href) :
                parentStyleSheet!.ownerNode?.baseURI || location.origin;
            url = getAbsoluteURL(baseURL, url);

            const absoluteValue = `url("${url}")`;

            return async (filter: FilterConfig): Promise<string | null> => {
                if (isURLEmpty) {
                    return "url('')";
                }
                let imageDetails: ImageDetails | null;
                if (imageDetailsCache.has(url)) {
                    imageDetails = imageDetailsCache.get(url)!;
                } else {
                    try {
                        if (awaitingForImageLoading.has(url)) {
                            const awaiters = awaitingForImageLoading.get(url)!;
                            imageDetails = await new Promise<ImageDetails | null>((resolve) => awaiters.push(resolve));
                            if (!imageDetails) {
                                return null;
                            }
                        } else {
                            awaitingForImageLoading.set(url, []);
                            imageDetails = await getImageDetails(url);
                            imageDetailsCache.set(url, imageDetails);
                            awaitingForImageLoading.get(url)!.forEach((resolve) => resolve(imageDetails));
                            awaitingForImageLoading.delete(url);
                        }
                        if (isCancelled()) {
                            return null;
                        }
                    } catch (err) {
                        logWarn(err);
                        if (awaitingForImageLoading.has(url)) {
                            awaitingForImageLoading.get(url)!.forEach((resolve) => resolve(null));
                            awaitingForImageLoading.delete(url);
                        }
                        return absoluteValue;
                    }
                }
                const bgImageValue = getBgImageValue(imageDetails, filter) || absoluteValue;
                return bgImageValue;
            };
        };

        const getBgImageValue = (imageDetails: ImageDetails, filter: FilterConfig) => {
            const {isDark, isLight, isTransparent, isLarge, isTooLarge, width} = imageDetails;
            let result: string | null;
            if (isTooLarge) {
                logInfo(`Not modifying too large image ${imageDetails.src}`);
                result = `url("${imageDetails.src}")`;
            } else if (isDark && isTransparent && filter.mode === 1 && !isLarge && width > 2) {
                logInfo(`Inverting dark image ${imageDetails.src}`);
                const inverted = getFilteredImageDataURL(imageDetails, {...filter, sepia: clamp(filter.sepia + 10, 0, 100)});
                result = `url("${inverted}")`;
            } else if (isLight && !isTransparent && filter.mode === 1) {
                if (isLarge) {
                    logInfo(`Not modifying light non-transparent large image ${imageDetails.src}`);
                    result = 'none';
                } else {
                    logInfo(`Dimming light image ${imageDetails.src}`);
                    const dimmed = getFilteredImageDataURL(imageDetails, filter);
                    result = `url("${dimmed}")`;
                }
            } else if (filter.mode === 0 && isLight && !isLarge) {
                logInfo(`Applying filter to image ${imageDetails.src}`);
                const filtered = getFilteredImageDataURL(imageDetails, {...filter, brightness: clamp(filter.brightness - 10, 5, 200), sepia: clamp(filter.sepia + 10, 0, 100)});
                result = `url("${filtered}")`;
            } else {
                logInfo(`Not modifying too large image ${imageDetails.src}`);
                result = null;
            }
            return result;
        };

        const modifiers: Array<CSSValueModifier | null> = [];

        let matchIndex = 0;
        let prevHasComma = false;
        matches.forEach(({type, match, index, typeGradient, hasComma, offset}, i) => {
            const matchStart = index;
            const prefixStart = matchIndex;
            const matchEnd = matchStart + match.length + offset;
            matchIndex = matchEnd;

            // Make sure we still push all the unrelated content between gradients and URLs.
            if (prefixStart !== matchStart) {
                if (prevHasComma) {
                    modifiers.push(() => {
                        let betweenValue = value.substring(prefixStart, matchStart);
                        if (betweenValue[0] === ',') {
                            betweenValue = betweenValue.substring(1);
                        }
                        return betweenValue;
                    });
                } else {
                    modifiers.push(() => value.substring(prefixStart, matchStart));
                }
            }
            prevHasComma = hasComma || false;

            if (type === 'url') {
                modifiers.push(getURLModifier(match));
            } else if (type === 'gradient') {
                modifiers.push(getGradientModifier({match, index, typeGradient: typeGradient as string, hasComma: hasComma || false, offset}));
            }

            if (i === matches.length - 1) {
                modifiers.push(() => value.substring(matchEnd));
            }
        });

        return (filter: FilterConfig) => {
            const results = modifiers.filter(Boolean).map((modify) => modify!(filter));
            if (results.some((r) => r instanceof Promise)) {
                return Promise.all(results).then((asyncResults) => {
                    return asyncResults.filter(Boolean).join('');
                });
            }
            // Strip `, initial` suffix. This is some weird computed value by the browser
            const combinedResult = results.join('');
            if (combinedResult.endsWith(', initial')) {
                return combinedResult.slice(0, -9);
            }
            return combinedResult;
        };
    } catch (err) {
        logWarn(`Unable to parse gradient ${value}`, err);
        return null;
    }
}

export function getShadowModifierWithInfo(value: string): CSSValueModifierWithInfo | null {
    try {
        let index = 0;
        const colorMatches = getMatches(/(^|\s)(?!calc)([a-z]+\(.+?\)|#[0-9a-f]+|[a-z]+)(.*?(inset|outset)?($|,))/ig, value, 2);
        let notParsed = 0;
        const modifiers = colorMatches.map((match, i) => {
            const prefixIndex = index;
            const matchIndex = value.indexOf(match, index);
            const matchEnd = matchIndex + match.length;
            index = matchEnd;
            const rgb = parseColorWithCache(match);
            if (!rgb) {
                notParsed++;
                return () => value.substring(prefixIndex, matchEnd);
            }
            return (filter: FilterConfig) => `${value.substring(prefixIndex, matchIndex)}${modifyShadowColor(rgb, filter)}${i === colorMatches.length - 1 ? value.substring(matchEnd) : ''}`;
        });

        return (filter: FilterConfig) => {
            const modified = modifiers.map((modify) => modify(filter)).join('');
            return {
                matchesLength: colorMatches.length,
                unparseableMatchesLength: notParsed,
                result: modified,
            };
        };
    } catch (err) {
        logWarn(`Unable to parse shadow ${value}`, err);
        return null;
    }
}

export function getShadowModifier(value: string): CSSValueModifier | null {
    const shadowModifier = getShadowModifierWithInfo(value);
    if (!shadowModifier) {
        return null;
    }
    return (theme: Theme) => shadowModifier(theme).result;
}

function getVariableModifier(
    variablesStore: VariablesStore,
    prop: string,
    value: string,
    rule: CSSStyleRule,
    ignoredImgSelectors: string[],
    isCancelled: () => boolean,
): CSSVariableModifier {
    return variablesStore.getModifierForVariable({
        varName: prop,
        sourceValue: value,
        rule,
        ignoredImgSelectors,
        isCancelled,
    });
}

function getVariableDependantModifier(
    variablesStore: VariablesStore,
    prop: string,
    value: string,
) {
    return variablesStore.getModifierForVarDependant(prop, value);
}

export function cleanModificationCache(): void {
    clearColorModificationCache();
    imageDetailsCache.clear();
    cleanImageProcessingCache();
    awaitingForImageLoading.clear();
}
