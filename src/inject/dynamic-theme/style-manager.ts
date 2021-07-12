import type {Theme} from '../../definitions';
import {forEach} from '../../utils/array';
import {getMatches} from '../../utils/text';
import {getAbsoluteURL} from '../../utils/url';
import {watchForNodePosition, removeNode, iterateShadowHosts, addReadyStateCompleteListener} from '../utils/dom';
import {logInfo, logWarn} from '../utils/log';
import {replaceCSSRelativeURLsWithAbsolute, removeCSSComments, replaceCSSFontFace, getCSSURLValue, cssImportRegex, getCSSBaseBath} from './css-rules';
import {bgFetch} from './network';
import {createStyleSheetModifier} from './stylesheet-modifier';
import {isShadowDomSupported, isSafari, isThunderbird, isChromium} from '../../utils/platform';

declare global {
    interface HTMLStyleElement {
        sheet: CSSStyleSheet;
    }
    interface HTMLLinkElement {
        sheet: CSSStyleSheet;
    }
    interface SVGStyleElement {
        sheet: CSSStyleSheet;
    }
    interface Document {
        adoptedStyleSheets: CSSStyleSheet[];
    }
    interface ShadowRoot {
        adoptedStyleSheets: CSSStyleSheet[];
    }
}

export type StyleElement = HTMLLinkElement | HTMLStyleElement;

export interface StyleManager {
    details(): {rules: CSSRuleList};
    render(theme: Theme, ignoreImageAnalysis: string[]): void;
    pause(): void;
    destroy(): void;
    watch(): void;
    restore(): void;
}

export const STYLE_SELECTOR = 'style, link[rel*="stylesheet" i]:not([disabled])';

export function shouldManageStyle(element: Node) {
    return (
        (
            (element instanceof HTMLStyleElement) ||
            (element instanceof SVGStyleElement) ||
            (
                element instanceof HTMLLinkElement &&
                element.rel &&
                element.rel.toLowerCase().includes('stylesheet') &&
                !element.disabled
            )
        ) &&
        !element.classList.contains('darkreader') &&
        element.media.toLowerCase() !== 'print' &&
        !element.classList.contains('stylus')
    );
}

export function getManageableStyles(node: Node, results = [] as StyleElement[], deep = true) {
    if (shouldManageStyle(node)) {
        results.push(node as StyleElement);
    } else if (node instanceof Element || (isShadowDomSupported && node instanceof ShadowRoot) || node === document) {
        forEach(
            (node as Element).querySelectorAll(STYLE_SELECTOR),
            (style: StyleElement) => getManageableStyles(style, results, false),
        );
        if (deep) {
            iterateShadowHosts(node, (host) => getManageableStyles(host.shadowRoot, results, false));
        }
    }
    return results;
}

const syncStyleSet = new WeakSet<HTMLStyleElement | SVGStyleElement>();
const corsStyleSet = new WeakSet<HTMLStyleElement>();

let canOptimizeUsingProxy = false;
document.addEventListener('__darkreader__inlineScriptsAllowed', () => {
    canOptimizeUsingProxy = true;
});

let loadingLinkCounter = 0;
const rejectorsForLoadingLinks = new Map<number, (reason?: any) => void>();

export function cleanLoadingLinks() {
    rejectorsForLoadingLinks.clear();
}

export function manageStyle(element: StyleElement, {update, loadingStart, loadingEnd}): StyleManager {
    const prevStyles: HTMLStyleElement[] = [];
    let next: Element = element;
    while ((next = next.nextElementSibling) && next.matches('.darkreader')) {
        prevStyles.push(next as HTMLStyleElement);
    }
    let corsCopy: HTMLStyleElement = prevStyles.find((el) => el.matches('.darkreader--cors') && !corsStyleSet.has(el)) || null;
    let syncStyle: HTMLStyleElement | SVGStyleElement = prevStyles.find((el) => el.matches('.darkreader--sync') && !syncStyleSet.has(el)) || null;

    let corsCopyPositionWatcher: ReturnType<typeof watchForNodePosition> = null;
    let syncStylePositionWatcher: ReturnType<typeof watchForNodePosition> = null;

    let cancelAsyncOperations = false;
    let isOverrideEmpty = true;

    const sheetModifier = createStyleSheetModifier();

    const observer = new MutationObserver(() => {
        update();
    });
    const observerOptions: MutationObserverInit = {attributes: true, childList: true, subtree: true, characterData: true};

    function containsCSSImport() {
        return element instanceof HTMLStyleElement && element.textContent.trim().match(cssImportRegex);
    }

    // It loops trough the cssRules and check for CSSImportRule and their `href`.
    // If the `href` isn't local and doesn't start with the same-origin.
    // We can be ensure that's a cross-origin import
    // And should add a cors-sheet to this element.
    function hasCrossOriginImports(cssRules: CSSRuleList) {
        let result = false;
        if (cssRules) {
            let rule: CSSRule;
            cssRulesLoop:
            for (let i = 0, len = cssRules.length; i < len; i++) {
                rule = cssRules[i];
                if ((rule as CSSImportRule).href) {
                    if ((rule as CSSImportRule).href.startsWith('http') && !(rule as CSSImportRule).href.startsWith(location.origin)) {
                        result = true;
                        break cssRulesLoop;
                    }
                }
            }
        }
        return result;
    }

    function getRulesSync(): CSSRuleList {
        if (corsCopy) {
            return corsCopy.sheet.cssRules;
        }
        if (containsCSSImport()) {
            return null;
        }

        const cssRules = safeGetSheetRules();
        if (hasCrossOriginImports(cssRules)) {
            return null;
        }

        return cssRules;
    }

    function insertStyle() {
        if (corsCopy) {
            if (element.nextSibling !== corsCopy) {
                element.parentNode.insertBefore(corsCopy, element.nextSibling);
            }
            if (corsCopy.nextSibling !== syncStyle) {
                element.parentNode.insertBefore(syncStyle, corsCopy.nextSibling);
            }
        } else if (element.nextSibling !== syncStyle) {
            element.parentNode.insertBefore(syncStyle, element.nextSibling);
        }
    }

    function createSyncStyle() {
        syncStyle = element instanceof SVGStyleElement ?
            document.createElementNS('http://www.w3.org/2000/svg', 'style') :
            document.createElement('style');
        syncStyle.classList.add('darkreader');
        syncStyle.classList.add('darkreader--sync');
        syncStyle.media = 'screen';
        if (!isChromium && element.title) {
            syncStyle.title = element.title;
        }
        syncStyleSet.add(syncStyle);
    }

    let isLoadingRules = false;
    let wasLoadingError = false;
    const loadingLinkId = ++loadingLinkCounter;

    async function getRulesAsync(): Promise<CSSRuleList> {
        let cssText: string;
        let cssBasePath: string;

        if (element instanceof HTMLLinkElement) {
            let [cssRules, accessError] = getRulesOrError();
            if (accessError) {
                logWarn(accessError);
            }

            if (
                (!cssRules && !accessError && !isSafari) ||
                (isSafari && !element.sheet) ||
                isStillLoadingError(accessError)
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

            const crossOriginImport = hasCrossOriginImports(cssRules);
            if (cssRules != null && !crossOriginImport) {
                return cssRules;
            }

            cssText = await loadText(element.href);
            cssBasePath = getCSSBaseBath(element.href);
            if (cancelAsyncOperations) {
                return null;
            }
        } else if (containsCSSImport()) {
            cssText = element.textContent.trim();
            cssBasePath = getCSSBaseBath(location.href);
        } else {
            return null;
        }

        if (cssText) {
            // Sometimes cross-origin stylesheets are protected from direct access
            // so need to load CSS text and insert it into style element
            try {
                const fullCSSText = await replaceCSSImports(cssText, cssBasePath);
                corsCopy = createCORSCopy(element, fullCSSText);
            } catch (err) {
                logWarn(err);
            }
            if (corsCopy) {
                corsCopyPositionWatcher = watchForNodePosition(corsCopy, 'prev-sibling');
                return corsCopy.sheet.cssRules;
            }
        }

        return null;
    }

    function details() {
        const rules = getRulesSync();
        if (!rules) {
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

        function prepareOverridesSheet() {
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
            if (syncStyle.sheet == null) {
                syncStyle.textContent = '';
            }

            const sheet = syncStyle.sheet;
            for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
                sheet.deleteRule(i);
            }

            if (syncStylePositionWatcher) {
                syncStylePositionWatcher.run();
            } else {
                syncStylePositionWatcher = watchForNodePosition(syncStyle, 'prev-sibling', () => {
                    forceRenderStyle = true;
                    buildOverrides();
                });
            }

            return syncStyle.sheet;
        }

        function buildOverrides() {
            const force = forceRenderStyle;
            forceRenderStyle = false;
            sheetModifier.modifySheet({
                prepareSheet: prepareOverridesSheet,
                sourceCSSRules: rules,
                theme,
                ignoreImageAnalysis,
                force,
                isAsyncCancelled: () => cancelAsyncOperations,
            });
            isOverrideEmpty = syncStyle.sheet.cssRules.length === 0;
            if (sheetModifier.shouldRebuildStyle()) {
                // "update" function schedules rebuilding the style
                // ideally to wait for link loading, because some sites put links any time,
                // but it can be complicated, so waiting for document completion can do the trick
                addReadyStateCompleteListener(() => update());
            }
        }

        buildOverrides();
    }

    function getRulesOrError(): [CSSRuleList, Error] {
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

    function watchForSheetChanges() {
        watchForSheetChangesUsingProxy();
        // Sometimes sheet can be null in Firefox and Safari
        // So need to watch for it using rAF
        if (!isThunderbird && !(canOptimizeUsingProxy && element.sheet)) {
            watchForSheetChangesUsingRAF();
        }
    }

    let rulesChangeKey: number = null;
    let rulesCheckFrameId: number = null;

    function getRulesChangeKey() {
        const rules = safeGetSheetRules();
        return rules ? rules.length : null;
    }

    function didRulesKeyChange() {
        return getRulesChangeKey() !== rulesChangeKey;
    }

    function watchForSheetChangesUsingRAF() {
        rulesChangeKey = getRulesChangeKey();
        stopWatchingForSheetChangesUsingRAF();
        const checkForUpdate = () => {
            if (didRulesKeyChange()) {
                rulesChangeKey = getRulesChangeKey();
                update();
            }
            if (canOptimizeUsingProxy && element.sheet) {
                stopWatchingForSheetChangesUsingRAF();
                return;
            }
            rulesCheckFrameId = requestAnimationFrame(checkForUpdate);
        };
        checkForUpdate();
    }

    function stopWatchingForSheetChangesUsingRAF() {
        cancelAnimationFrame(rulesCheckFrameId);
    }

    let areSheetChangesPending = false;

    function onSheetChange() {
        canOptimizeUsingProxy = true;
        stopWatchingForSheetChangesUsingRAF();
        if (areSheetChangesPending) {
            return;
        }

        function handleSheetChanges() {
            areSheetChangesPending = false;
            if (cancelAsyncOperations) {
                return;
            }
            update();
        }

        areSheetChangesPending = true;
        if (typeof queueMicrotask === 'function') {
            queueMicrotask(handleSheetChanges);
        } else {
            requestAnimationFrame(handleSheetChanges);
        }
    }

    function watchForSheetChangesUsingProxy() {
        element.addEventListener('__darkreader__updateSheet', onSheetChange);
    }

    function stopWatchingForSheetChangesUsingProxy() {
        element.removeEventListener('__darkreader__updateSheet', onSheetChange);
    }

    function stopWatchingForSheetChanges() {
        stopWatchingForSheetChangesUsingProxy();
        stopWatchingForSheetChangesUsingRAF();
    }

    function pause() {
        observer.disconnect();
        cancelAsyncOperations = true;
        corsCopyPositionWatcher && corsCopyPositionWatcher.stop();
        syncStylePositionWatcher && syncStylePositionWatcher.stop();
        stopWatchingForSheetChanges();
    }

    function destroy() {
        pause();
        removeNode(corsCopy);
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
            watchForSheetChanges();
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
        link.addEventListener('load', onLoad);
        link.addEventListener('error', onError);
        if (!link.href) {
            onError();
        }
    });
}

function getCSSImportURL(importDeclaration: string) {
    return getCSSURLValue(importDeclaration.substring(8).replace(/;$/, ''));
}

async function loadText(url: string) {
    if (url.startsWith('data:')) {
        return await (await fetch(url)).text();
    }
    return await bgFetch({url, responseType: 'text', mimeType: 'text/css', origin: window.location.origin});
}

async function replaceCSSImports(cssText: string, basePath: string, cache = new Map<string, string>()) {
    cssText = removeCSSComments(cssText);
    cssText = replaceCSSFontFace(cssText);
    cssText = replaceCSSRelativeURLsWithAbsolute(cssText, basePath);

    const importMatches = getMatches(cssImportRegex, cssText);
    for (const match of importMatches) {
        const importURL = getCSSImportURL(match);
        const absoluteURL = getAbsoluteURL(basePath, importURL);
        let importedCSS: string;
        if (cache.has(absoluteURL)) {
            importedCSS = cache.get(absoluteURL);
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
        cssText = cssText.split(match).join(importedCSS);
    }

    cssText = cssText.trim();

    return cssText;
}

function createCORSCopy(srcElement: StyleElement, cssText: string) {
    if (!cssText) {
        return null;
    }

    const cors = document.createElement('style');
    cors.classList.add('darkreader');
    cors.classList.add('darkreader--cors');
    cors.media = 'screen';
    cors.textContent = cssText;
    srcElement.parentNode.insertBefore(cors, srcElement.nextSibling);
    cors.sheet.disabled = true;
    corsStyleSet.add(cors);
    return cors;
}
