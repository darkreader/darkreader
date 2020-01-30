import {iterateCSSRules, iterateCSSDeclarations, getCSSVariables, replaceCSSRelativeURLsWithAbsolute, removeCSSComments, replaceCSSFontFace, replaceCSSVariables, getCSSURLValue, cssImportRegex, getCSSBaseBath} from './css-rules';
import {getModifiableCSSDeclaration, ModifiableCSSDeclaration, ModifiableCSSRule} from './modify-css';
import {bgFetch} from './network';
import {removeNode} from '../utils/dom';
import {logWarn} from '../utils/log';
import {createAsyncTasksQueue} from '../utils/throttle';
import {isDeepSelectorSupported} from '../../utils/platform';
import {getMatches} from '../../utils/text';
import {FilterConfig} from '../../definitions';
import {getAbsoluteURL} from './url';

declare global {
    interface HTMLStyleElement {
        sheet: CSSStyleSheet;
    }
    interface HTMLLinkElement {
        sheet: CSSStyleSheet;
    }
}

export interface StyleManager {
    details(): {variables: Map<string, string>};
    render(filter: FilterConfig, variables: Map<string, string>): void;
    pause(): void;
    destroy(): void;
    watch(): void;
    restore(): void;
}

export const STYLE_SELECTOR = isDeepSelectorSupported()
    ? 'html /deep/ link[rel*="stylesheet" i], html /deep/ style'
    : 'html link[rel*="stylesheet" i], html style';

export function shouldManageStyle(element: Node) {
    return (
        (
            (element instanceof HTMLStyleElement) ||
            (element instanceof HTMLLinkElement && element.rel && element.rel.toLowerCase().includes('stylesheet'))
        ) &&
        !element.classList.contains('darkreader') &&
        element.media !== 'print'
    );
}

const asyncQueue = createAsyncTasksQueue();

export function manageStyle(element: HTMLLinkElement | HTMLStyleElement, {update, loadingStart, loadingEnd}): StyleManager {

    const prevStyles: HTMLStyleElement[] = [];
    let next: Element = element;
    while ((next = next.nextElementSibling) && next.matches('.darkreader')) {
        prevStyles.push(next as HTMLStyleElement);
    }
    let corsCopy: HTMLStyleElement = prevStyles.find((el) => el.matches('.darkreader--cors')) || null;
    let syncStyle: HTMLStyleElement = prevStyles.find((el) => el.matches('.darkreader--sync')) || null;

    let cancelAsyncOperations = false;

    function isCancelled() {
        return cancelAsyncOperations;
    }

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
        if (element.sheet == null) {
            return null;
        }
        if (element instanceof HTMLLinkElement) {
            try {
                return element.sheet.cssRules;
            } catch (err) {
                logWarn(err);
                return null;
            }
        }
        if (containsCSSImport()) {
            return null;
        }
        return safeGetSheetRules();
    }

    function insertStyle() {
        if (corsCopy) {
            if (element.nextSibling !== corsCopy) {
                element.parentElement.insertBefore(corsCopy, element.nextSibling);
            }
            if (corsCopy.nextSibling !== syncStyle) {
                element.parentElement.insertBefore(syncStyle, corsCopy.nextSibling);
            }
        } else if (element.nextSibling !== syncStyle) {
            element.parentElement.insertBefore(syncStyle, element.nextSibling);
        }
    }

    let isLoadingRules = false;
    let wasLoadingError = false;

    async function getRulesAsync(): Promise<CSSRuleList> {
        let cssText: string;
        let cssBasePath: string;

        if (element instanceof HTMLLinkElement) {
            if (element.sheet == null) {
                try {
                    await linkLoading(element);
                    if (cancelAsyncOperations) {
                        return null;
                    }
                } catch (err) {
                    logWarn(err);
                    wasLoadingError = true;
                    return null;
                }
            }
            try {
                if (element.sheet.cssRules != null) {
                    return element.sheet.cssRules;
                }
            } catch (err) {
                logWarn(err);
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

    function getFilterKey(filter: FilterConfig) {
        return ['mode', 'brightness', 'contrast', 'grayscale', 'sepia'].map((p) => `${p}:${filter[p]}`).join(';');
    }

    let renderId = 0;
    const rulesTextCache = new Map<string, string>();
    const rulesModCache = new Map<string, ModifiableCSSRule>();
    let prevFilterKey: string = null;
    let forceRestore = false;

    function render(filter: FilterConfig, variables: Map<string, string>) {
        const rules = getRulesSync();
        if (!rules) {
            return;
        }

        cancelAsyncOperations = false;
        let rulesChanged = (rulesModCache.size === 0);
        const notFoundCacheKeys = new Set(rulesModCache.keys());
        const filterKey = getFilterKey(filter);
        const filterChanged = (filterKey !== prevFilterKey);

        const modRules: ModifiableCSSRule[] = [];
        iterateCSSRules(rules, (rule) => {
            const cssText = rule.cssText;
            let textDiffersFromPrev = false;

            notFoundCacheKeys.delete(cssText);
            if (!rulesTextCache.has(cssText)) {
                rulesTextCache.set(cssText, cssText);
                textDiffersFromPrev = true;
            }

            // Put CSS text with inserted CSS variables into separate <style> element
            // to properly handle composite properties (e.g. background -> background-color)
            let vars: HTMLStyleElement = null;
            let varsRule: CSSStyleRule = null;
            if (variables.size > 0 || cssText.includes('var(')) {
                const cssTextWithVariables = replaceCSSVariables(cssText, variables);
                if (rulesTextCache.get(cssText) !== cssTextWithVariables) {
                    rulesTextCache.set(cssText, cssTextWithVariables);
                    textDiffersFromPrev = true;
                    vars = document.createElement('style');
                    vars.classList.add('darkreader');
                    vars.classList.add('darkreader--vars');
                    vars.media = 'screen';
                    vars.textContent = cssTextWithVariables;
                    element.parentNode.insertBefore(vars, element.nextSibling);
                    varsRule = (vars.sheet as CSSStyleSheet).cssRules[0] as CSSStyleRule;
                }
            }

            if (textDiffersFromPrev) {
                rulesChanged = true;
            } else {
                modRules.push(rulesModCache.get(cssText));
                return;
            }

            const modDecs: ModifiableCSSDeclaration[] = [];
            const targetRule = varsRule || rule;
            targetRule && targetRule.style && iterateCSSDeclarations(targetRule.style, (property, value) => {
                const mod = getModifiableCSSDeclaration(property, value, rule, isCancelled);
                if (mod) {
                    modDecs.push(mod);
                }
            });

            let modRule: ModifiableCSSRule = null;
            if (modDecs.length > 0) {
                modRule = {selector: rule.selectorText, declarations: modDecs};
                if (rule.parentRule instanceof CSSMediaRule) {
                    modRule.media = (rule.parentRule as CSSMediaRule).media.mediaText;
                }
                modRules.push(modRule);
            }
            rulesModCache.set(cssText, modRule);

            removeNode(vars);
        });

        notFoundCacheKeys.forEach((key) => {
            rulesTextCache.delete(key);
            rulesModCache.delete(key);
        });
        prevFilterKey = filterKey;

        if (!forceRestore && !rulesChanged && !filterChanged) {
            return;
        }

        renderId++;
        forceRestore = false;

        interface ReadyDeclaration {
            media: string;
            selector: string;
            property: string;
            value: string;
            important: boolean;
            sourceValue: string;
            asyncKey?: number;
        }

        function setRule(target: CSSStyleSheet | CSSGroupingRule, index: number, declarations: ReadyDeclaration[]) {
            const {selector} = declarations[0];
            target.insertRule(`${selector} {}`, index);
            const style = (target.cssRules.item(index) as CSSStyleRule).style;
            declarations.forEach(({property, value, important, sourceValue}) => {
                style.setProperty(property, value == null ? sourceValue : value, important ? 'important' : '');
            });
        }

        interface AsyncRule {
            declarations: ReadyDeclaration[];
            target: (CSSStyleSheet | CSSGroupingRule);
            index: number;
        }

        const readyDeclarations: ReadyDeclaration[] = [];
        const asyncDeclarations = new Map<number, AsyncRule>();
        let asyncDeclarationCounter = 0;

        function buildStyleSheet() {
            const groups: ReadyDeclaration[][][] = [];
            readyDeclarations.forEach((decl, i) => {
                let mediaGroup: ReadyDeclaration[][];
                let selectorGroup: ReadyDeclaration[];
                const prev = i === 0 ? null : readyDeclarations[i - 1];
                const isSameMedia = prev && prev.media === decl.media;
                const isSameMediaAndSelector = prev && isSameMedia && prev.selector === decl.selector;
                if (isSameMedia) {
                    mediaGroup = groups[groups.length - 1];
                } else {
                    mediaGroup = [];
                    groups.push(mediaGroup);
                }
                if (isSameMediaAndSelector) {
                    selectorGroup = mediaGroup[mediaGroup.length - 1];
                } else {
                    selectorGroup = [];
                    mediaGroup.push(selectorGroup);
                }
                selectorGroup.push(decl);
            });

            if (!syncStyle) {
                syncStyle = document.createElement('style');
                syncStyle.classList.add('darkreader');
                syncStyle.classList.add('darkreader--sync');
                syncStyle.media = 'screen';
            }

            insertStyle();

            const sheet = syncStyle.sheet;
            for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
                sheet.deleteRule(i);
            }

            groups.forEach((mediaGroup) => {
                const {media} = mediaGroup[0][0];
                let target: CSSStyleSheet | CSSGroupingRule;
                if (media) {
                    sheet.insertRule(`@media ${media} {}`, sheet.cssRules.length);
                    target = sheet.cssRules[sheet.cssRules.length - 1] as CSSMediaRule;
                } else {
                    target = sheet;
                }
                mediaGroup.forEach((selectorGroup) => {
                    const asyncItems = selectorGroup.filter(({value}) => value == null);
                    if (asyncItems.length > 0) {
                        asyncItems.forEach(({asyncKey}) => asyncDeclarations.set(asyncKey, {declarations: selectorGroup, target, index: target.cssRules.length}));
                    }
                    setRule(target, target.cssRules.length, selectorGroup);
                });
            });
        }

        function rebuildAsyncRule(key: number) {
            const {declarations, target, index} = asyncDeclarations.get(key);
            target.deleteRule(index);
            setRule(target, index, declarations);
            asyncDeclarations.delete(key);
        }

        modRules.filter((r) => r).forEach(({selector, declarations, media}) => {
            declarations.forEach(({property, value, important, sourceValue}) => {
                if (typeof value === 'function') {
                    const modified = value(filter);
                    if (modified instanceof Promise) {
                        const index = readyDeclarations.length;
                        const asyncKey = asyncDeclarationCounter++;
                        readyDeclarations.push({media, selector, property, value: null, important, asyncKey, sourceValue});
                        const promise = modified;
                        const currentRenderId = renderId;
                        promise.then((asyncValue) => {
                            if (!asyncValue || cancelAsyncOperations || currentRenderId !== renderId) {
                                return;
                            }
                            readyDeclarations[index].value = asyncValue;
                            asyncQueue.add(() => {
                                if (cancelAsyncOperations || currentRenderId !== renderId) {
                                    return;
                                }
                                rebuildAsyncRule(asyncKey);
                            });
                        });
                    } else {
                        readyDeclarations.push({media, selector, property, value: modified, important, sourceValue});
                    }
                } else {
                    readyDeclarations.push({media, selector, property, value, important, sourceValue});
                }
            });
        });

        buildStyleSheet();
    }

    let rulesCount: number = null;
    let rulesCheckFrameId: number = null;

    // Seems like Firefox bug: silent exception is produced
    // without any notice, when accessing <style> CSS rules
    function safeGetSheetRules() {
        try {
            return element.sheet.cssRules;
        } catch (err) {
            logWarn(err);
            return null;
        }
    }

    function subscribeToSheetChanges() {
        if (element.sheet && safeGetSheetRules()) {
            rulesCount = element.sheet.cssRules.length;
        }
        unsubscribeFromSheetChanges();
        const checkForUpdate = () => {
            if (element.sheet && safeGetSheetRules() &&
                element.sheet.cssRules.length !== rulesCount
            ) {
                rulesCount = element.sheet.cssRules.length;
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
        moveCount++;
        if (moveCount > maxMoveCount) {
            logWarn('Style sheet was moved multiple times', element);
            return;
        }

        const shouldRestore = syncStyle.sheet == null;
        insertStyle();
        if (shouldRestore) {
            forceRestore = true;
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

function createCORSCopy(srcElement: HTMLLinkElement | HTMLStyleElement, cssText: string) {
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
