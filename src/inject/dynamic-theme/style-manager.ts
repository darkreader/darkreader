import {getCSSVariables, replaceCSSRelativeURLsWithAbsolute, removeCSSComments, replaceCSSFontFace, getCSSURLValue, cssImportRegex, getCSSBaseBath} from './css-rules';
import {bgFetch} from './network';
import {watchForNodePosition, removeNode, iterateShadowHosts} from '../utils/dom';
import {logWarn} from '../utils/log';
import {forEach} from '../../utils/array';
import {getMatches} from '../../utils/text';
import {Theme} from '../../definitions';
import {createStyleSheetModifier} from './stylesheet-modifier';
import {getAbsoluteURL} from './url';
import {IS_SHADOW_DOM_SUPPORTED} from '../../utils/platform';

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
        adoptedStyleSheets: Array<CSSStyleSheet>;
    }
    interface ShadowRoot {
        adoptedStyleSheets: Array<CSSStyleSheet>;
    }
}

export type StyleElement = HTMLLinkElement | HTMLStyleElement;

export interface StyleManager {
    details(): {variables: Map<string, string>};
    render(theme: Theme, variables: Map<string, string>): void;
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
        element.media !== 'print' &&
        !element.classList.contains('stylus')
    );
}

export function getManageableStyles(node: Node, results = [] as StyleElement[], deep = true) {
    if (shouldManageStyle(node)) {
        results.push(node as StyleElement);
    } else if (node instanceof Element || (IS_SHADOW_DOM_SUPPORTED && node instanceof ShadowRoot) || node === document) {
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

export function manageStyle(element: StyleElement, {update, loadingStart, loadingEnd}): StyleManager {
    const prevStyles: HTMLStyleElement[] = [];
    let next: Element = element;
    while ((next = next.nextElementSibling) && next.matches('.darkreader')) {
        prevStyles.push(next as HTMLStyleElement);
    }
    let corsCopy: HTMLStyleElement = prevStyles.find((el) => el.matches('.darkreader--cors')) || null;
    let syncStyle: HTMLStyleElement | SVGStyleElement = prevStyles.find((el) => el.matches('.darkreader--sync')) || null;

    let corsCopyPositionWatcher: ReturnType<typeof watchForNodePosition> = null;
    let syncStylePositionWatcher: ReturnType<typeof watchForNodePosition> = null;

    let cancelAsyncOperations = false;

    const sheetModifier = createStyleSheetModifier();

    const observer = new MutationObserver(() => {
        update();
    });
    const observerOptions: MutationObserverInit = {attributes: true, childList: true, characterData: true};

    function containsCSSImport() {
        return element instanceof HTMLStyleElement && element.textContent.trim().match(cssImportRegex);
    }

    function getRulesSync(): CSSRuleList {
        if (corsCopy) {
            return corsCopy.sheet.cssRules;
        }
        if (containsCSSImport()) {
            return null;
        }
        return safeGetSheetRules();
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
    }

    let isLoadingRules = false;
    let wasLoadingError = false;

    async function getRulesAsync(): Promise<CSSRuleList> {
        let cssText: string;
        let cssBasePath: string;

        if (element instanceof HTMLLinkElement) {
            let [cssRules, accessError] = getRulesOrError();
            if (accessError) {
                logWarn(accessError);
            }

            if ((cssRules && !accessError) || isStillLoadingError(accessError)) {
                try {
                    await linkLoading(element);
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

            if (cssRules != null) {
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
        const variables = getCSSVariables(rules);
        return {variables};
    }

    let forceRenderStyle = false;

    function render(theme: Theme, variables: Map<string, string>) {
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
                variables,
                force,
                isAsyncCancelled: () => cancelAsyncOperations,
            });
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

    let rulesChangeKey: number = null;
    let rulesCheckFrameId: number = null;

    function updateRulesChangeKey() {
        const rules = safeGetSheetRules();
        if (rules) {
            rulesChangeKey = rules.length;
        }
    }

    function didRulesKeyChange() {
        const rules = safeGetSheetRules();
        return rules && rules.length !== rulesChangeKey;
    }

    function subscribeToSheetChanges() {
        updateRulesChangeKey();
        unsubscribeFromSheetChanges();
        const checkForUpdate = () => {
            if (didRulesKeyChange()) {
                updateRulesChangeKey();
                update();
            }
            rulesCheckFrameId = requestAnimationFrame(checkForUpdate);
        };
        checkForUpdate();
    }

    function unsubscribeFromSheetChanges() {
        cancelAnimationFrame(rulesCheckFrameId);
    }

    function pause() {
        observer.disconnect();
        cancelAsyncOperations = true;
        corsCopyPositionWatcher && corsCopyPositionWatcher.stop();
        syncStylePositionWatcher && syncStylePositionWatcher.stop();
        unsubscribeFromSheetChanges();
    }

    function destroy() {
        pause();
        removeNode(corsCopy);
        removeNode(syncStyle);
    }

    function watch() {
        observer.observe(element, observerOptions);
        if (element instanceof HTMLStyleElement) {
            subscribeToSheetChanges();
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
        const shouldForceRender = syncStyle.sheet == null || syncStyle.sheet.cssRules.length > 0;
        insertStyle();
        corsCopyPositionWatcher && corsCopyPositionWatcher.skip();
        syncStylePositionWatcher && syncStylePositionWatcher.skip();
        if (shouldForceRender) {
            forceRenderStyle = true;
            updateRulesChangeKey();
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

function linkLoading(link: HTMLLinkElement) {
    return new Promise<void>((resolve, reject) => {
        const cleanUp = () => {
            link.removeEventListener('load', onLoad);
            link.removeEventListener('error', onError);
        };
        const onLoad = () => {
            cleanUp();
            resolve();
        };
        const onError = () => {
            cleanUp();
            reject(`Link loading failed ${link.href}`);
        };
        link.addEventListener('load', onLoad);
        link.addEventListener('error', onError);
    });
}

function getCSSImportURL(importDeclaration: string) {
    return getCSSURLValue(importDeclaration.substring(8).replace(/;$/, ''));
}

async function loadText(url: string) {
    if (url.startsWith('data:')) {
        return await (await fetch(url)).text();
    }
    return await bgFetch({url, responseType: 'text', mimeType: 'text/css'});
}

async function replaceCSSImports(cssText: string, basePath: string) {
    cssText = removeCSSComments(cssText);
    cssText = replaceCSSFontFace(cssText);
    cssText = replaceCSSRelativeURLsWithAbsolute(cssText, basePath);

    const importMatches = getMatches(cssImportRegex, cssText);
    for (const match of importMatches) {
        const importURL = getCSSImportURL(match);
        const absoluteURL = getAbsoluteURL(basePath, importURL);
        let importedCSS: string;
        try {
            importedCSS = await loadText(absoluteURL);
            importedCSS = await replaceCSSImports(importedCSS, getCSSBaseBath(absoluteURL));
        } catch (err) {
            logWarn(err);
            importedCSS = '';
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

    return cors;
}
