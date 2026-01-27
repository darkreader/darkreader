import type {Theme} from '../../definitions';
import {parseColorWithCache, rgbToHSL, hslToString, RGBA} from '../../utils/color';
import type {ParsedGradient} from '../../utils/css-text/parse-gradient';
import {parseGradient} from '../../utils/css-text/parse-gradient';
import {clamp} from '../../utils/math';
import {isCSSColorSchemePropSupported, isLayerRuleSupported} from '../../utils/platform';
import {getMatches} from '../../utils/text';
import {getAbsoluteURL} from '../../utils/url';
import {readImageDetailsCache, writeImageDetailsCache} from '../cache';
import {logWarn, logInfo} from '../utils/log';

import {cssURLRegex, getCSSURLValue, getCSSBaseBath} from './css-rules';
import type {ImageDetails} from './image';
import {getImageDetails, getFilteredImageURL, cleanImageProcessingCache, requestBlobURLCheck, isBlobURLCheckResultReady, tryConvertDataURLToBlobURL} from './image';
import {modifyBackgroundColor, modifyBorderColor, modifyForegroundColor, modifyGradientColor, modifyShadowColor, clearColorModificationCache} from './modify-colors';
import {getSheetScope} from './style-scope';
import type {CSSVariableModifier, VariablesStore} from './variables';


declare const __CHROMIUM_MV3__: boolean;

export type CSSValueModifier = (theme: Theme) => string | Promise<string | null>;

export interface CSSValueModifierResult {
    result: string;
    matchesLength: number;
    unparsableMatchesLength: number;
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

const bgPropsToCopy = [
    'background-clip',
    'background-position',
    'background-repeat',
    'background-size',
];

export function getModifiableCSSDeclaration(
    property: string,
    value: string,
    rule: CSSStyleRule,
    variablesStore: VariablesStore,
    ignoreImageSelectors: string[],
    isCancelled: (() => boolean) | null,
): ModifiableCSSDeclaration | null {
    let modifier: ModifiableCSSDeclaration['value'] | null = null;
    if (property.startsWith('--')) {
        modifier = getVariableModifier(variablesStore, property, value, rule, ignoreImageSelectors, isCancelled!);
    } else if (value.includes('var(')) {
        modifier = getVariableDependantModifier(variablesStore, property, value);
    } else if (property === 'color-scheme') {
        modifier = getColorSchemeModifier();
    } else if (property === 'scrollbar-color') {
        modifier = getScrollbarColorModifier(value);
    } else if (
        (
            property.includes('color') &&
            property !== '-webkit-print-color-adjust'
        ) ||
        property === 'fill' ||
        property === 'stroke' ||
        property === 'stop-color'
    ) {
        if (property.startsWith('border') && property !== 'border-color' && value === 'initial') {
            const borderSideProp = property.substring(0, property.length - 6);
            const borderSideVal = rule.style.getPropertyValue(borderSideProp);
            if (borderSideVal.startsWith('0px') || borderSideVal === 'none') {
                property = borderSideProp;
                modifier = borderSideVal;
            } else {
                modifier = value;
            }
        } else {
            modifier = getColorModifier(property, value, rule);
        }
    } else if (property === 'background-image' || property === 'list-style-image') {
        modifier = getBgImageModifier(value, rule, ignoreImageSelectors, isCancelled!);
    } else if (property.includes('shadow')) {
        modifier = getShadowModifier(value);
    } else if (bgPropsToCopy.includes(property) && value !== 'initial') {
        modifier = value;
    }

    if (!modifier) {
        return null;
    }

    return {property, value: modifier, important: getPriority(rule.style, property), sourceValue: value};
}

function joinSelectors(...selectors: string[]) {
    return selectors.filter(Boolean).join(', ');
}

const hostsWithOddScrollbars = [
    'calendar.google.com',
];

export function getModifiedUserAgentStyle(theme: Theme, isIFrame: boolean, styleSystemControls: boolean): string {
    const lines: string[] = [];
    if (!isIFrame) {
        lines.push('html {');
        lines.push(`    background-color: ${modifyBackgroundColor({r: 255, g: 255, b: 255}, theme)} !important;`);
        lines.push('}');
    }
    // color-scheme can change the background of an iframe
    // that is supposed to be transparent
    if ((__CHROMIUM_MV3__ || isCSSColorSchemePropSupported) && theme.mode === 1) {
        lines.push('html {');
        lines.push(`    color-scheme: dark !important;`);
        lines.push('}');
        lines.push('iframe {');
        lines.push(`    color-scheme: dark !important;`);
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
    lines.push('mark {');
    lines.push(`    color: ${modifyForegroundColor({r: 0, g: 0, b: 0}, theme)};`);
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
    if (theme.scrollbarColor && !hostsWithOddScrollbars.includes(location.hostname)) {
        lines.push(getModifiedScrollbarStyle(theme));
    }
    if (theme.selectionColor) {
        lines.push(getModifiedSelectionStyle(theme));
    }
    if (isLayerRuleSupported) {
        lines.unshift('@layer {');
        lines.push('}');
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
    let colorTrack: string;
    let colorThumb: string;
    if (theme.scrollbarColor === 'auto') {
        colorTrack = modifyBackgroundColor({r: 241, g: 241, b: 241}, theme);
        colorThumb = modifyBackgroundColor({r: 176, g: 176, b: 176}, theme);
    } else {
        const rgb = parseColorWithCache(theme.scrollbarColor)!;
        const hsl = rgbToHSL(rgb);
        const darken = (darker: number) => ({...hsl, l: clamp(hsl.l - darker, 0, 1)});
        colorTrack = hslToString(darken(0.4));
        colorThumb = hslToString(hsl);
    }
    return [
        `* {`,
        `    scrollbar-color: ${colorThumb} ${colorTrack};`,
        `}`,
    ].join('\n');
}

export function getModifiedFallbackStyle(theme: Theme, {strict}: {strict: boolean}): string {
    const factory = fallbackFactory || defaultFallbackFactory;
    return factory(theme, {strict});
}

type FallbackFactory = (theme: Theme, options: {strict: boolean}) => string;

function defaultFallbackFactory(theme: Theme, {strict}: {strict: boolean}): string {
    const lines: string[] = [];
    lines.push(`html, body, ${strict ? 'body :not(iframe)' : 'body > :not(iframe)'} {`);
    lines.push(`    background-color: ${modifyBackgroundColor({r: 255, g: 255, b: 255}, theme)} !important;`);
    lines.push(`    border-color: ${modifyBorderColor({r: 64, g: 64, b: 64}, theme)} !important;`);
    lines.push(`    color: ${modifyForegroundColor({r: 0, g: 0, b: 0}, theme)} !important;`);
    lines.push('}');
    // MS Learn High Contrast issue
    // https://github.com/darkreader/darkreader/issues/3618
    lines.push(`div[style*="background-color: rgb(135, 135, 135)"] {`);
    lines.push(`    background-color: #878787 !important;`);
    lines.push('}');
    return lines.join('\n');
}

let fallbackFactory: FallbackFactory | null = null;

const colorModifiers = {
    background: modifyBackgroundColor,
    border: modifyBorderColor,
    foreground: modifyForegroundColor,
};

export function createFallbackFactory(fn: (colors: typeof colorModifiers) => FallbackFactory): void {
    fallbackFactory = fn(colorModifiers);
}

const unparsableColors = new Set([
    'inherit',
    'transparent',
    'initial',
    'currentcolor',
    'none',
    'unset',
    'auto',
]);

function getColorModifier(prop: string, value: string, rule: CSSStyleRule): string | CSSValueModifier | null {
    if (
        unparsableColors.has(value.toLowerCase()) &&
        !(prop === 'color' && value === 'initial')
    ) {
        return value;
    }
    let rgb: RGBA | null = null;
    if (prop === 'color' && value === 'initial') {
        rgb = {r: 0, g: 0, b: 0, a: 1};
    } else {
        rgb = parseColorWithCache(value);
    }
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
            return (theme) => modifyForegroundColor(rgb, theme);
        }
        return (theme) => modifyBackgroundColor(rgb, theme);
    }
    if (prop.includes('border') || prop.includes('outline')) {
        return (theme) => modifyBorderColor(rgb, theme);
    }
    return (theme) => modifyForegroundColor(rgb, theme);
}

const imageDetailsCache = new Map<string, ImageDetails>();
const awaitingForImageLoading = new Map<string, Array<(imageDetails: ImageDetails | null) => void>>();
let didTryLoadCache = false;

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
        if (ignoredSelector.startsWith('^')) {
            const beginning = ignoredSelector.slice(1);
            if (ruleSelectors.some((s) => s.startsWith(beginning))) {
                return true;
            }
        } else if (ignoredSelector.endsWith('$')) {
            const ending = ignoredSelector.slice(0, ignoredSelector.length - 1);
            if (ruleSelectors.some((s) => s.endsWith(ending))) {
                return true;
            }
        } else if (ruleSelectors.some((s) => s === ignoredSelector)) {
            return true;
        }
    }
    return false;
}

interface BgImageMatches {
    type: 'url' | 'gradient';
    index: number;
    match: string;
    offset: number;
    typeGradient?: string;
    hasComma?: boolean;
}

const imageSelectorQueue = new Map<string, Array<() => void>>();
const imageSelectorValues = new Map<string, string>();
const imageSelectorNodeQueue = new Set<Element>();
let imageSelectorQueueFrameId: number | null = null;
let classObserver: MutationObserver | null = null;

export function checkImageSelectors(node: Element | Document | ShadowRoot): void {
    for (const [selector, callbacks] of imageSelectorQueue) {
        if (node.querySelector(selector) || (node instanceof Element && node.matches(selector))) {
            imageSelectorQueue.delete(selector);
            callbacks.forEach((cb) => cb());
        }
    }
    if (!classObserver) {
        classObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                imageSelectorNodeQueue.add(mutation.target as Element);
                if (!imageSelectorQueueFrameId) {
                    imageSelectorQueueFrameId = requestAnimationFrame(() => {
                        imageSelectorNodeQueue.forEach((element) => {
                            checkImageSelectors(element);
                        });
                        imageSelectorNodeQueue.clear();
                        imageSelectorQueueFrameId = null;
                    });
                }
            });
        });
        classObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['class'], subtree: true});
    }
}

export function getBgImageModifier(
    value: string,
    rule: CSSStyleRule,
    ignoreImageSelectors: string[],
    isCancelled: () => boolean,
): string | CSSValueModifier | null {
    try {
        if (shouldIgnoreImage(rule.selectorText, ignoreImageSelectors)) {
            return value;
        }

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

        const matches: BgImageMatches[] =
            (gradients.map((i) => ({type: 'gradient', ...i})) as BgImageMatches[])
                .concat(getIndices(urls).map((i) => ({type: 'url', offset: 0, ...i})))
                .sort((a, b) => a.index > b.index ? 1 : -1);

        const getGradientModifier = (gradient: ParsedGradient) => {
            const {typeGradient, match, hasComma} = gradient;

            const partsRegex = /([^\(\),]+(\([^\(\)]*(\([^\(\)]*\)*[^\(\)]*)?\))?([^\(\), ]|( (?!calc)))*),?/g;
            const colorStopRegex = /^(from|color-stop|to)\(([^\(\)]*?,\s*)?(.*?)\)$/;

            const parts = getMatches(partsRegex, match, 1).map((part) => {
                part = part.trim();

                let rgb = parseColorWithCache(part);
                if (rgb) {
                    return (theme: Theme) => modifyGradientColor(rgb!, theme);
                }

                const space = part.lastIndexOf(' ');
                rgb = parseColorWithCache(part.substring(0, space));
                if (rgb) {
                    return (theme: Theme) => `${modifyGradientColor(rgb!, theme)} ${part.substring(space + 1)}`;
                }

                const colorStopMatch = part.match(colorStopRegex);
                if (colorStopMatch) {
                    rgb = parseColorWithCache(colorStopMatch[3]);
                    if (rgb) {
                        return (theme: Theme) => `${colorStopMatch[1]}(${colorStopMatch[2] ? `${colorStopMatch[2]}, ` : ''}${modifyGradientColor(rgb!, theme)})`;
                    }
                }

                return () => part;
            });

            return (theme: Theme) => {
                return `${typeGradient}(${parts.map((modify) => modify(theme)).join(', ')})${hasComma ? ', ' : ''}`;
            };
        };

        const getURLModifier = (urlValue: string) => {
            if (!didTryLoadCache) {
                didTryLoadCache = true;
                readImageDetailsCache(imageDetailsCache);
            }

            let url = getCSSURLValue(urlValue);
            const isURLEmpty = url.length === 0;
            const {parentStyleSheet} = rule;
            const ownerNode = parentStyleSheet?.ownerNode;
            const scope = (parentStyleSheet && getSheetScope(parentStyleSheet)) ?? document;
            const baseURL = (parentStyleSheet && parentStyleSheet.href) ?
                getCSSBaseBath(parentStyleSheet.href) :
                ownerNode?.baseURI || location.origin;
            url = getAbsoluteURL(baseURL, url);

            return async (theme: Theme): Promise<string | null> => {
                if (isURLEmpty) {
                    return "url('')";
                }

                let selector = rule.selectorText;
                if (selector) {
                    if (selector.includes('::before')) {
                        selector = selector.replaceAll('::before', '');
                    }
                    if (selector.includes('::after')) {
                        selector = selector.replaceAll('::after', '');
                    }
                    if (!scope.querySelector(selector)) {
                        await new Promise<void>((resolve) => {
                            if (imageSelectorQueue.has(selector)) {
                                imageSelectorQueue.get(selector)!.push(resolve);
                            } else {
                                imageSelectorQueue.set(selector, [resolve]);
                                imageSelectorValues.set(selector, urlValue);
                            }
                        });
                    }
                }

                let imageDetails: ImageDetails | null = null;
                if (imageDetailsCache.has(url)) {
                    imageDetails = imageDetailsCache.get(url)!;
                } else {
                    try {
                        if (!isBlobURLCheckResultReady()) {
                            await requestBlobURLCheck();
                        }
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
                            if (!url.startsWith('data:')) {
                                const parsedURL = new URL(url);
                                if (parsedURL.origin === location.origin) {
                                    writeImageDetailsCache(url, imageDetails);
                                }
                            }
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
                    }
                }
                if (imageDetails) {
                    const bgImageValue = getBgImageValue(imageDetails, theme);
                    if (bgImageValue) {
                        return bgImageValue;
                    }
                }
                if (url.startsWith('data:')) {
                    const blobURL = await tryConvertDataURLToBlobURL(url);
                    if (blobURL) {
                        return `url("${blobURL}")`;
                    }
                }
                return `url("${url}")`;;
            };
        };

        const getBgImageValue = (imageDetails: ImageDetails, theme: Theme) => {
            const {isDark, isLight, isTransparent, isLarge, width} = imageDetails;
            let result: string | null;
            const logSrc = imageDetails.src.startsWith('data:') ? 'data:' : imageDetails.src;
            if (isLarge && isLight && !isTransparent && theme.mode === 1) {
                logInfo(`Hiding large light image ${logSrc}`);
                result = 'none';
            } else if (isDark && isTransparent && theme.mode === 1 && width > 2) {
                logInfo(`Inverting dark image ${logSrc}`);
                const inverted = getFilteredImageURL(imageDetails, {...theme, sepia: clamp(theme.sepia + 10, 0, 100)});
                result = `url("${inverted}")`;
            } else if (isLight && !isTransparent && theme.mode === 1) {
                logInfo(`Dimming light image ${logSrc}`);
                const dimmed = getFilteredImageURL(imageDetails, theme);
                result = `url("${dimmed}")`;
            } else if (theme.mode === 0 && isLight) {
                logInfo(`Applying filter to image ${logSrc}`);
                const filtered = getFilteredImageURL(imageDetails, {...theme, brightness: clamp(theme.brightness - 10, 5, 200), sepia: clamp(theme.sepia + 10, 0, 100)});
                result = `url("${filtered}")`;
            } else {
                logInfo(`Not modifying the image ${logSrc}`);
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

        return (theme: Theme) => {
            const results = modifiers.filter(Boolean).map((modify) => modify!(theme));
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
            return (theme: Theme) => `${value.substring(prefixIndex, matchIndex)}${modifyShadowColor(rgb, theme)}${i === colorMatches.length - 1 ? value.substring(matchEnd) : ''}`;
        });

        return (theme: Theme) => {
            const modified = modifiers.map((modify) => modify(theme)).join('');
            return {
                matchesLength: colorMatches.length,
                unparsableMatchesLength: notParsed,
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

export function getScrollbarColorModifier(value: string): string | CSSValueModifier | null {
    const colorsMatch = value.match(/^\s*([a-z]+(\(.*\))?)\s+([a-z]+(\(.*\))?)\s*$/);
    if (!colorsMatch) {
        return value;
    }

    const thumb = parseColorWithCache(colorsMatch[1]);
    const track = parseColorWithCache(colorsMatch[3]);
    if (!thumb || !track) {
        logWarn("Couldn't parse color", ...([thumb, track].filter((c) => !c)));
        return null;
    }

    return (theme) => `${modifyForegroundColor(thumb, theme)} ${modifyBackgroundColor(track, theme)}`;
}

export function getColorSchemeModifier(): CSSValueModifier {
    return (theme: Theme) => theme.mode === 0 ? 'dark light' : 'dark';
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
    imageSelectorQueue.clear();
    classObserver?.disconnect();
    classObserver = null;
}
