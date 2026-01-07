import type {Theme} from '../../definitions';
import {forEach} from '../../utils/array';
import {removeCSSComments} from '../../utils/css-text/css-text';
import {loadAsText} from '../../utils/network';
import {isShadowDomSupported, isSafari, isFirefox} from '../../utils/platform';
import {getMatchesWithOffsets} from '../../utils/text';
import {getAbsoluteURL, isRelativeHrefOnAbsolutePath} from '../../utils/url';
import {readCSSFetchCache, writeCSSFetchCache} from '../cache';
import {watchForNodePosition, removeNode, iterateShadowHosts, addReadyStateCompleteListener} from '../utils/dom';
import {logInfo, logWarn} from '../utils/log';

import {replaceCSSRelativeURLsWithAbsolute, replaceCSSFontFace, getCSSURLValue, cssImportRegex, getCSSBaseBath, ignoredMedia} from './css-rules';
import {getStyleInjectionMode, injectStyleAway} from './injection';
import {bgFetch} from './network';
import {createStyleSheetModifier} from './stylesheet-modifier';
import {createSheetWatcher} from './watch/sheet-changes';

declare global {
    interface Document {
        adoptedStyleSheets: CSSStyleSheet[];
    }
    interface ShadowRoot {
        adoptedStyleSheets: CSSStyleSheet[];
    }
}

export type StyleElement = HTMLLinkElement | HTMLStyleElement;

export type detailsArgument = {secondRound: boolean};
export interface StyleManager {
    details(options: detailsArgument): {rules: CSSRuleList} | null;
    render(theme: Theme, ignoreImageAnalysis: string[]): void;
    pause(): void;
    destroy(): void;
    watch(): void;
    restore(): void;
}

export const STYLE_SELECTOR = 'style, link[rel*="stylesheet" i]:not([disabled])';

// isFontsGoogleApiStyle returns is the given link element is a style from
// google fonts.
function isFontsGoogleApiStyle(element: HTMLLinkElement): boolean {
    if (!element.href) {
        return false;
    }

    try {
        const elementURL = new URL(element.href);
        return elementURL.hostname === 'fonts.googleapis.com';
    } catch (err) {
        logInfo(`Couldn't construct ${element.href} as URL`);
        return false;
    }
}

const hostsBreakingOnSVGStyleOverride = [
    'account.containerstore.com',
    'containerstore.com',
    'www.onet.pl',
];

export function shouldManageStyle(element: Node | null): boolean {
    return (
        (
            (element instanceof HTMLStyleElement) ||
            (element instanceof SVGStyleElement && !hostsBreakingOnSVGStyleOverride.includes(location.hostname)) ||
            (
                element instanceof HTMLLinkElement &&
                Boolean(element.rel) &&
                element.rel.toLowerCase().includes('stylesheet') &&
                Boolean(element.href) &&
                !element.disabled &&
                (isFirefox ? !element.href.startsWith('moz-extension://') : true) &&
                !isFontsGoogleApiStyle(element)
            )
        ) &&
        !element.classList.contains('darkreader') &&
        !ignoredMedia.includes(element.media.toLowerCase()) &&
        !element.classList.contains('stylus')
    );
}

export function getManageableStyles(node: Node | null, results: StyleElement[] = [], deep = true): StyleElement[] {
    if (shouldManageStyle(node)) {
        results.push(node as StyleElement);
    } else if (node instanceof Element || (isShadowDomSupported && node instanceof ShadowRoot) || node === document) {
        forEach(
            (node as Element).querySelectorAll(STYLE_SELECTOR),
            (style: StyleElement) => getManageableStyles(style, results, false),
        );
        if (
            deep && (
                (node as Element).children?.length > 0 || 
                (node as Element).shadowRoot
            )
        ) {
            iterateShadowHosts(node, (host) => getManageableStyles(host.shadowRoot, results, false));
        }
    }
    return results;
}

const syncStyleSet = new WeakSet<HTMLStyleElement | SVGStyleElement>();
const corsCopies = new WeakMap<StyleElement, CSSStyleSheet>();
const corsCopiesTextLengths = new WeakMap<StyleElement, number>();

let loadingLinkCounter = 0;
const rejectorsForLoadingLinks = new Map<number, (reason?: any) => void>();

export function cleanLoadingLinks(): void {
    rejectorsForLoadingLinks.clear();
}

export function manageStyle(element: StyleElement, {update, loadingStart, loadingEnd}: {update: () => void; loadingStart: () => void; loadingEnd: () => void}): StyleManager {
    const inMode = getStyleInjectionMode();

    let syncStyle: HTMLStyleElement | SVGStyleElement | null = null;

    if (inMode === 'next') {
        const prevStyles: HTMLStyleElement[] = [];
        let next: Element | null = element;
        while ((next = next.nextElementSibling) && next.matches('.darkreader')) {
            prevStyles.push(next as HTMLStyleElement);
        }
        syncStyle = prevStyles.find((el) => el.matches('.darkreader--sync') && !syncStyleSet.has(el)) || null;
    }

    let corsCopyPositionWatcher: ReturnType<typeof watchForNodePosition> | null = null;
    let syncStylePositionWatcher: ReturnType<typeof watchForNodePosition> | null = null;

    let cancelAsyncOperations = false;
    let isOverrideEmpty = true;
    const isAsyncCancelled = () => cancelAsyncOperations;

    const sheetModifier = createStyleSheetModifier();

    const observer = new MutationObserver((mutations) => {
        if (mutations.some((m) => m.type === 'characterData') && containsCSSImport()) {
            // Sometimes when <style> element text is too long, it
            // may still be loading and contain @import later.
            const cssText = (element.textContent ?? '').trim();
            createOrUpdateCORSCopy(cssText, location.href).then(update);
        } else {
            update();
        }
    });
    const observerOptions: MutationObserverInit = {attributes: true, childList: true, subtree: true, characterData: true};

    function containsCSSImport() {
        if (!(element instanceof HTMLStyleElement)) {
            return false;
        }
        const cssText = removeCSSComments(element.textContent ?? '').trim();
        return cssText.match(cssImportRegex);
    }

    // It loops trough the cssRules and check for CSSImportRule and their `href`.
    // If the `href` isn't local and doesn't start with the same-origin.
    // We can be ensure that's a cross-origin import
    // And should add a cors-sheet to this element.
    function hasImports(cssRules: CSSRuleList | null, checkCrossOrigin: boolean) {
        let result = false;
        if (cssRules) {
            let rule: CSSRule;
            cssRulesLoop:
            for (let i = 0, len = cssRules.length; i < len; i++) {
                rule = cssRules[i];
                if ((rule as CSSImportRule).href) {
                    if (checkCrossOrigin) {
                        if (!(rule as CSSImportRule).href.startsWith('https://fonts.googleapis.com/') &&
                            (rule as CSSImportRule).href.startsWith('http') &&
                            !(rule as CSSImportRule).href.startsWith(location.origin)) {
                            result = true;
                            break cssRulesLoop;
                        }
                    } else {
                        result = true;
                        break cssRulesLoop;
                    }
                }
            }
        }
        return result;
    }

    function getRulesSync(): CSSRuleList | null {
        if (corsCopies.has(element)) {
            logInfo('[getRulesSync] Using cors-copy.');
            return corsCopies.get(element)!.cssRules;
        }
        if (containsCSSImport()) {
            logInfo('[getRulesSync] CSSImport detected.');
            return null;
        }

        const cssRules = safeGetSheetRules();
        if (
            element instanceof HTMLLinkElement &&
            !isRelativeHrefOnAbsolutePath(element.href) &&
            hasImports(cssRules, false)
        ) {
            logInfo('[getRulesSync] CSSImportRule detected on non-local href.');
            return null;
        }

        if (hasImports(cssRules, true)) {
            logInfo('[getRulesSync] Cross-Origin CSSImportRule detected.');
            return null;
        }

        logInfo('[getRulesSync] Using cssRules.');
        !cssRules && logWarn('[getRulesSync] cssRules is null, trying again.');
        return cssRules;
    }

    function insertStyle() {
        if (inMode === 'next') {
            if (element.nextSibling !== syncStyle) {
                element.parentNode!.insertBefore(syncStyle!, element.nextSibling);
            }
        } else if (inMode === 'away') {
            injectStyleAway(syncStyle!);
        }
    }

    function createSyncStyle() {
        syncStyle = element instanceof SVGStyleElement ?
            document.createElementNS('http://www.w3.org/2000/svg', 'style') :
            document.createElement('style');
        syncStyle.classList.add('darkreader');
        syncStyle.classList.add('darkreader--sync');
        syncStyle.media = 'screen';
        if (element.title) {
            syncStyle.title = element.title;
        }
        syncStyleSet.add(syncStyle);
    }

    let isLoadingRules = false;
    let wasLoadingError = false;
    const loadingLinkId = ++loadingLinkCounter;

    async function getRulesAsync(): Promise<CSSRuleList | null> {
        let cssText: string;
        let cssBasePath: string;

        if (element instanceof HTMLLinkElement) {
            let [cssRules, accessError] = getRulesOrError();
            if (accessError) {
                logWarn(accessError);
            }

            if (
                (isSafari && !element.sheet) ||
                (!isSafari && !cssRules && !accessError) ||
                isStillLoadingError(accessError!)
            ) {
                try {
                    logInfo(`Linkelement ${loadingLinkId} is not loaded yet and thus will be await for`, element);
                    await linkLoading(element, loadingLinkId);
                } catch (err) {
                    // NOTE: Some @import resources can fail,
                    // but the style sheet can still be valid.
                    // There's no way to get the actual error.
                    logWarn(err);
                    wasLoadingError = true;
                }
                if (cancelAsyncOperations) {
                    return null;
                }

                [cssRules, accessError] = getRulesOrError();
                if (accessError) {
                    // CORS error, cssRules are not accessible
                    // for cross-origin resources
                    logWarn(accessError);
                }
            }

            if (cssRules) {
                if (!hasImports(cssRules, false)) {
                    return cssRules;
                }
            }

            try {
                cssText = await loadText(element.href);
            } catch (err) {
                logWarn(err);
                cssText = '';
            }
            cssBasePath = getCSSBaseBath(element.href);
            if (cancelAsyncOperations) {
                return null;
            }
        } else if (containsCSSImport()) {
            cssText = element.textContent!.trim();
            cssBasePath = getCSSBaseBath(location.href);
        } else {
            return null;
        }

        await createOrUpdateCORSCopy(cssText, cssBasePath);
        if (corsCopies.has(element)) {
            return corsCopies.get(element)!.cssRules;
        }

        return null;
    }

    async function createOrUpdateCORSCopy(cssText: string, cssBasePath: string) {
        if (cssText) {
            // Sometimes cross-origin stylesheets are protected from direct access
            // so need to load CSS text and insert it into style element
            try {
                const fullCSSText = await replaceCSSImports(cssText, cssBasePath);
                if (corsCopies.has(element)) {
                    if ((corsCopiesTextLengths.get(element) ?? 0) < fullCSSText.length) {
                        corsCopies.get(element)!.replaceSync(fullCSSText);
                        corsCopiesTextLengths.set(element, fullCSSText.length);
                    }
                } else {
                    const corsCopy = new CSSStyleSheet();
                    corsCopy.replaceSync(fullCSSText);
                    corsCopies.set(element, corsCopy);
                }
            } catch (err) {
                logWarn(err);
            }
        }
    }

    function details(options: detailsArgument) {
        const rules = getRulesSync();
        if (!rules) {
            // secondRound is only true after it's
            // has gone trough `details()` & `getRulesAsync` already
            // So that means that `getRulesSync` shouldn't fail.
            // However as a fail-safe to prevent loops, we should
            // return null here and not continue to `getRulesAsync`
            if (options.secondRound) {
                logWarn('Detected dead-lock at details(), returning early to prevent it.');
                return null;
            }
            if (isLoadingRules || wasLoadingError) {
                return null;
            }
            isLoadingRules = true;
            loadingStart();
            getRulesAsync().then((results) => {
                isLoadingRules = false;
                loadingEnd();
                if (results) {
                    update();
                }
            }).catch((err) => {
                logWarn(err);
                isLoadingRules = false;
                loadingEnd();
            });
            return null;
        }
        return {rules};
    }

    let forceRenderStyle = false;

    function render(theme: Theme, ignoreImageAnalysis: string[]) {
        const rules = getRulesSync();
        if (!rules) {
            return;
        }

        cancelAsyncOperations = false;

        function removeCSSRulesFromSheet(sheet: CSSStyleSheet) {
            if (!sheet) {
                return;
            }
            for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
                sheet.deleteRule(i);
            }
        }

        function prepareOverridesSheet(): CSSStyleSheet {
            if (!syncStyle) {
                createSyncStyle();
            }

            syncStylePositionWatcher && syncStylePositionWatcher.stop();
            insertStyle();

            // Firefox issue: Some websites get CSP warning,
            // when `textContent` is not set (e.g. pypi.org).
            // But for other websites (e.g. facebook.com)
            // some images disappear when `textContent`
            // is initially set to an empty string.
            if (syncStyle!.sheet == null) {
                syncStyle!.textContent = '';
            }

            const sheet = syncStyle!.sheet;

            removeCSSRulesFromSheet(sheet!);

            if (syncStylePositionWatcher) {
                syncStylePositionWatcher.run();
            } else if (inMode === 'next') {
                syncStylePositionWatcher = watchForNodePosition(syncStyle!, 'prev-sibling', () => {
                    forceRenderStyle = true;
                    buildOverrides();
                });
            }

            return syncStyle!.sheet!;
        }

        function buildOverrides() {
            const force = forceRenderStyle;
            forceRenderStyle = false;
            sheetModifier.modifySheet({
                prepareSheet: prepareOverridesSheet,
                sourceCSSRules: rules!,
                theme,
                ignoreImageAnalysis,
                force,
                isAsyncCancelled,
            });
            isOverrideEmpty = !syncStyle!.sheet || syncStyle!.sheet!.cssRules.length === 0;
            if (sheetModifier.shouldRebuildStyle()) {
                // "update" function schedules rebuilding the style
                // ideally to wait for link loading, because some sites put links any time,
                // but it can be complicated, so waiting for document completion can do the trick
                addReadyStateCompleteListener(() => update());
            }
        }

        buildOverrides();
    }

    function getRulesOrError(): [CSSRuleList | null, Error | null] {
        try {
            if (element.sheet == null) {
                return [null, null];
            }
            return [element.sheet.cssRules, null];
        } catch (err) {
            return [null, err];
        }
    }

    // NOTE: In Firefox, when link is loading,
    // `sheet` property is not null,
    // but `cssRules` access error is thrown
    function isStillLoadingError(error: Error) {
        return error && error.message && error.message.includes('loading');
    }

    // Seems like Firefox bug: silent exception is produced
    // without any notice, when accessing <style> CSS rules
    function safeGetSheetRules() {
        const [cssRules, err] = getRulesOrError();
        if (err) {
            logWarn(err);
            return null;
        }
        return cssRules;
    }

    const sheetChangeWatcher = createSheetWatcher(element, safeGetSheetRules, update, isAsyncCancelled);

    function pause() {
        observer.disconnect();
        cancelAsyncOperations = true;
        corsCopyPositionWatcher && corsCopyPositionWatcher.stop();
        syncStylePositionWatcher && syncStylePositionWatcher.stop();
        sheetChangeWatcher.stop();
    }

    function destroy() {
        pause();
        corsCopies.delete(element);
        removeNode(syncStyle);
        loadingEnd();
        if (rejectorsForLoadingLinks.has(loadingLinkId)) {
            const reject = rejectorsForLoadingLinks.get(loadingLinkId);
            rejectorsForLoadingLinks.delete(loadingLinkId);
            reject && reject();
        }
    }

    function watch() {
        observer.observe(element, observerOptions);
        if (element instanceof HTMLStyleElement) {
            sheetChangeWatcher.start();
        }
    }

    const maxMoveCount = 10;
    let moveCount = 0;

    function restore() {
        if (!syncStyle) {
            return;
        }

        moveCount++;
        if (moveCount > maxMoveCount) {
            logWarn('Style sheet was moved multiple times', element);
            return;
        }

        logWarn('Restore style', syncStyle, element);
        insertStyle();
        corsCopyPositionWatcher && corsCopyPositionWatcher.skip();
        syncStylePositionWatcher && syncStylePositionWatcher.skip();
        if (!isOverrideEmpty) {
            forceRenderStyle = true;
            update();
        }
    }

    return {
        details,
        render,
        pause,
        destroy,
        watch,
        restore,
    };
}

async function linkLoading(link: HTMLLinkElement, loadingId: number) {
    return new Promise<void>((resolve, reject) => {
        const cleanUp = () => {
            link.removeEventListener('load', onLoad);
            link.removeEventListener('error', onError);
            rejectorsForLoadingLinks.delete(loadingId);
        };

        const onLoad = () => {
            cleanUp();
            logInfo(`Linkelement ${loadingId} has been loaded`);
            resolve();
        };

        const onError = () => {
            cleanUp();
            reject(`Linkelement ${loadingId} couldn't be loaded. ${link.href}`);
        };

        rejectorsForLoadingLinks.set(loadingId, () => {
            cleanUp();
            reject();
        });
        link.addEventListener('load', onLoad, {passive: true});
        link.addEventListener('error', onError, {passive: true});
        if (!link.href) {
            onError();
        }
    });
}

function getCSSImportURL(importDeclaration: string) {
    // substring(7) is used to remove `@import` from the string.
    // And then use .trim() to remove the possible whitespaces.
    return getCSSURLValue(importDeclaration.substring(7).trim().replace(/;$/, '').replace(/screen$/, ''));
}

async function loadText(url: string) {
    if (url.startsWith('data:')) {
        return await (await fetch(url)).text();
    }

    const cache = readCSSFetchCache(url);
    if (cache) {
        return cache;
    }

    const parsedURL = new URL(url);
    let text: string;
    if (parsedURL.origin === location.origin) {
        text = await loadAsText(url, 'text/css', location.origin);
    } else {
        text = await bgFetch({url, responseType: 'text', mimeType: 'text/css', origin: location.origin});
    }
    if (parsedURL.origin === location.origin) {
        writeCSSFetchCache(url, text);
    }
    return text;
}

async function replaceCSSImports(cssText: string, basePath: string, cache = new Map<string, string>()) {
    cssText = removeCSSComments(cssText);
    cssText = replaceCSSFontFace(cssText);
    cssText = replaceCSSRelativeURLsWithAbsolute(cssText, basePath);

    const importMatches = getMatchesWithOffsets(cssImportRegex, cssText);
    let prev: {text: string; offset: number} | null = null;
    let shouldIgnoreImportsInBetween = false;
    let diff = 0;
    for (const match of importMatches) {
        let importedCSS: string;
        const prevImportEnd = prev ? (prev.offset + prev.text.length) : 0;
        const nextImportStart = match.offset;
        const openBraceIndex = cssText.indexOf('{', prevImportEnd);
        const closeBraceIndex = cssText.indexOf('}', prevImportEnd);
        if (
            shouldIgnoreImportsInBetween || (
                openBraceIndex >= 0 && openBraceIndex < nextImportStart &&
                closeBraceIndex >= 0 && closeBraceIndex < nextImportStart
            )
        ) {
            shouldIgnoreImportsInBetween = true;
            importedCSS = '';
        } else {
            const importURL = getCSSImportURL(match.text);
            const absoluteURL = getAbsoluteURL(basePath, importURL);
            if (cache.has(absoluteURL)) {
                importedCSS = cache.get(absoluteURL)!;
            } else {
                try {
                    importedCSS = await loadText(absoluteURL);
                    cache.set(absoluteURL, importedCSS);
                    importedCSS = await replaceCSSImports(importedCSS, getCSSBaseBath(absoluteURL), cache);
                } catch (err) {
                    logWarn(err);
                    importedCSS = '';
                }
            }
        }
        cssText = (
            cssText.substring(0, match.offset + diff) +
            importedCSS +
            cssText.substring(match.offset + match.text.length + diff)
        );
        diff += importedCSS.length - match.text.length;
        prev = match;
    }

    cssText = cssText.trim();

    return cssText;
}
