import {overrideInlineStyle, getInlineOverrideStyle, watchForInlineStyles, stopWatchingForInlineStyles, INLINE_STYLE_SELECTOR} from './inline-style';
import {changeMetaThemeColorWhenAvailable, restoreMetaThemeColor} from './meta-theme-color';
import {getModifiedUserAgentStyle, getModifiedFallbackStyle, cleanModificationCache, getSelectionColor} from './modify-css';
import type {StyleElement, StyleManager} from './style-manager';
import {manageStyle, getManageableStyles, cleanLoadingLinks} from './style-manager';
import {watchForStyleChanges, stopWatchingForStyleChanges} from './watch';
import {forEach, push, toArray} from '../../utils/array';
import {removeNode, watchForNodePosition, iterateShadowHosts, isDOMReady, removeDOMReadyListener, cleanReadyStateCompleteListeners, addDOMReadyListener, setIsDOMReady} from '../utils/dom';
import {logInfo, logWarn} from '../utils/log';
import {requestAnimationFrameOnce, throttle} from '../../utils/throttle';
import {clamp} from '../../utils/math';
import {getCSSFilterValue} from '../../generators/css-filter';
import {modifyBackgroundColor, modifyColor, modifyForegroundColor} from '../../generators/modify-colors';
import {createTextStyle} from '../../generators/text-style';
import type {Theme, DynamicThemeFix} from '../../definitions';
import {generateUID} from '../../utils/uid';
import type {AdoptedStyleSheetManager, AdoptedStyleSheetFallback} from './adopted-style-manger';
import {createAdoptedStyleSheetOverride, createAdoptedStyleSheetFallback, canHaveAdoptedStyleSheets} from './adopted-style-manger';
import {isFirefox} from '../../utils/platform';
import {injectProxy} from './stylesheet-proxy';
import {clearColorCache, parseColorWithCache} from '../../utils/color';
import {parsedURLCache} from '../../utils/url';
import {variablesStore} from './variables';
import {setDocumentVisibilityListener, documentIsVisible, removeDocumentVisibilityListener} from '../../utils/visibility';
import {combineFixes, findRelevantFix} from './fixes';

export {createFallbackFactory} from './modify-css';

declare const __TEST__: boolean;
declare const __CHROMIUM_MV3__: boolean;
const INSTANCE_ID = generateUID();
const styleManagers = new Map<StyleElement, StyleManager>();
const adoptedStyleManagers: AdoptedStyleSheetManager[] = [];
const adoptedStyleFallbacks = new Map<Document | ShadowRoot, AdoptedStyleSheetFallback>();
const adoptedStyleNodeIds = new WeakMap<Document | ShadowRoot, number>();
const adoptedStyleChangeTokens = new WeakMap<Document | ShadowRoot, symbol>();
let theme: Theme | null = null;
let fixes: DynamicThemeFix | null = null;
let isIFrame: boolean | null = null;
let ignoredImageAnalysisSelectors: string[] = [];
let ignoredInlineSelectors: string[] = [];

function createOrUpdateStyle(className: string, root: ParentNode = document.head || document): HTMLStyleElement {
    let element: HTMLStyleElement | null = root.querySelector(`.${className}`);
    if (!element) {
        element = document.createElement('style');
        element.classList.add('darkreader');
        element.classList.add(className);
        element.media = 'screen';
        element.textContent = '';
    }
    return element;
}

/**
 * Note: This function is used only with MV2.
 */
function createOrUpdateScript(className: string, root: ParentNode = document.head || document): HTMLScriptElement {
    let element: HTMLScriptElement | null = root.querySelector(`.${className}`);
    if (!element) {
        element = document.createElement('script');
        element.classList.add('darkreader');
        element.classList.add(className);
    }
    return element;
}

/**
 * Note: This function is used only with MV3.
 * The string passed as the src parameter must be included in the web_accessible_resources manifest key.
 */
function injectProxyScriptMV3(enableStyleSheetsProxy: boolean, enableCustomElementRegistryProxy: boolean): void {
    logInfo('MV3 proxy injector: regular path attempts to inject...');
    const element = document.createElement('script');
    element.src = chrome.runtime.getURL('inject/proxy.js');
    element.dataset.arg = JSON.stringify({enableStyleSheetsProxy, enableCustomElementRegistryProxy});
    document.head.prepend(element);
}

const nodePositionWatchers = new Map<string, ReturnType<typeof watchForNodePosition>>();

function setupNodePositionWatcher(node: Node, alias: string) {
    nodePositionWatchers.has(alias) && nodePositionWatchers.get(alias)!.stop();
    nodePositionWatchers.set(alias, watchForNodePosition(node, 'head'));
}

function stopStylePositionWatchers() {
    forEach(nodePositionWatchers.values(), (watcher) => watcher.stop());
    nodePositionWatchers.clear();
}

function createStaticStyleOverrides() {
    const fallbackStyle = createOrUpdateStyle('darkreader--fallback', document);
    fallbackStyle.textContent = getModifiedFallbackStyle(theme!, {strict: true});
    document.head.insertBefore(fallbackStyle, document.head.firstChild);
    setupNodePositionWatcher(fallbackStyle, 'fallback');

    const userAgentStyle = createOrUpdateStyle('darkreader--user-agent');
    userAgentStyle.textContent = getModifiedUserAgentStyle(theme!, isIFrame!, theme!.styleSystemControls);
    document.head.insertBefore(userAgentStyle, fallbackStyle.nextSibling);
    setupNodePositionWatcher(userAgentStyle, 'user-agent');

    const textStyle = createOrUpdateStyle('darkreader--text');
    if (theme!.useFont || theme!.textStroke > 0) {
        textStyle.textContent = createTextStyle(theme!);
    } else {
        textStyle.textContent = '';
    }
    document.head.insertBefore(textStyle, fallbackStyle.nextSibling);
    setupNodePositionWatcher(textStyle, 'text');

    const invertStyle = createOrUpdateStyle('darkreader--invert');
    if (fixes && Array.isArray(fixes.invert) && fixes.invert.length > 0) {
        invertStyle.textContent = [
            `${fixes.invert.join(', ')} {`,
            `    filter: ${getCSSFilterValue({
                ...theme!,
                contrast: theme!.mode === 0 ? theme!.contrast : clamp(theme!.contrast - 10, 0, 100),
            })} !important;`,
            '}',
        ].join('\n');
    } else {
        invertStyle.textContent = '';
    }
    document.head.insertBefore(invertStyle, textStyle.nextSibling);
    setupNodePositionWatcher(invertStyle, 'invert');

    const inlineStyle = createOrUpdateStyle('darkreader--inline');
    inlineStyle.textContent = getInlineOverrideStyle();
    document.head.insertBefore(inlineStyle, invertStyle.nextSibling);
    setupNodePositionWatcher(inlineStyle, 'inline');

    const overrideStyle = createOrUpdateStyle('darkreader--override');
    overrideStyle.textContent = fixes && fixes.css ? replaceCSSTemplates(fixes.css) : '';
    document.head.appendChild(overrideStyle);
    setupNodePositionWatcher(overrideStyle, 'override');

    const variableStyle = createOrUpdateStyle('darkreader--variables');
    const selectionColors = getSelectionColor(theme!);
    const {darkSchemeBackgroundColor, darkSchemeTextColor, lightSchemeBackgroundColor, lightSchemeTextColor, mode} = theme!;
    let schemeBackgroundColor = mode === 0 ? lightSchemeBackgroundColor : darkSchemeBackgroundColor;
    let schemeTextColor = mode === 0 ? lightSchemeTextColor : darkSchemeTextColor;
    schemeBackgroundColor = modifyBackgroundColor(parseColorWithCache(schemeBackgroundColor)!, theme!);
    schemeTextColor = modifyForegroundColor(parseColorWithCache(schemeTextColor)!, theme!);
    variableStyle.textContent = [
        `:root {`,
        `   --darkreader-neutral-background: ${schemeBackgroundColor};`,
        `   --darkreader-neutral-text: ${schemeTextColor};`,
        `   --darkreader-selection-background: ${selectionColors.backgroundColorSelection};`,
        `   --darkreader-selection-text: ${selectionColors.foregroundColorSelection};`,
        `}`,
    ].join('\n');
    document.head.insertBefore(variableStyle, inlineStyle.nextSibling);
    setupNodePositionWatcher(variableStyle, 'variables');

    const rootVarsStyle = createOrUpdateStyle('darkreader--root-vars');
    document.head.insertBefore(rootVarsStyle, variableStyle.nextSibling);

    const enableStyleSheetsProxy = !(fixes && fixes.disableStyleSheetsProxy);
    const enableCustomElementRegistryProxy = !(fixes && fixes.disableCustomElementRegistryProxy);
    document.dispatchEvent(new CustomEvent('__darkreader__cleanUp'));
    if (__CHROMIUM_MV3__) {
        injectProxyScriptMV3(enableStyleSheetsProxy, enableCustomElementRegistryProxy);
        // Notify the dedicated injector of the data.
        document.dispatchEvent(new CustomEvent('__darkreader__stylesheetProxy__arg', {detail: {enableStyleSheetsProxy, enableCustomElementRegistryProxy}}));
    } else {
        const proxyScript = createOrUpdateScript('darkreader--proxy');
        proxyScript.append(`(${injectProxy})(${enableStyleSheetsProxy}, ${enableCustomElementRegistryProxy})`);
        document.head.insertBefore(proxyScript, rootVarsStyle.nextSibling);
        proxyScript.remove();
    }
}

const shadowRootsWithOverrides = new Set<ShadowRoot>();

function createShadowStaticStyleOverridesInner(root: ShadowRoot) {
    const inlineStyle = createOrUpdateStyle('darkreader--inline', root);
    inlineStyle.textContent = getInlineOverrideStyle();
    root.insertBefore(inlineStyle, root.firstChild);
    const overrideStyle = createOrUpdateStyle('darkreader--override', root);
    overrideStyle.textContent = fixes && fixes.css ? replaceCSSTemplates(fixes.css) : '';
    root.insertBefore(overrideStyle, inlineStyle.nextSibling);

    const invertStyle = createOrUpdateStyle('darkreader--invert', root);
    if (fixes && Array.isArray(fixes.invert) && fixes.invert.length > 0) {
        invertStyle.textContent = [
            `${fixes.invert.join(', ')} {`,
            `    filter: ${getCSSFilterValue({
                ...theme!,
                contrast: theme!.mode === 0 ? theme!.contrast : clamp(theme!.contrast - 10, 0, 100),
            })} !important;`,
            '}',
        ].join('\n');
    } else {
        invertStyle.textContent = '';
    }
    root.insertBefore(invertStyle, overrideStyle.nextSibling);
    shadowRootsWithOverrides.add(root);
}

function delayedCreateShadowStaticStyleOverrides(root: ShadowRoot): void {
    const observer = new MutationObserver((mutations, observer) => {
        // Disconnect observer immediately before making any other changes
        observer.disconnect();

        // Do not make any changes unless Dark Reader's fixes have been removed
        for (const {type, removedNodes} of mutations) {
            if (type === 'childList') {
                for (const {nodeName, className} of removedNodes as any) {
                    if (nodeName === 'STYLE' && ['darkreader darkreader--inline', 'darkreader darkreader--override', 'darkreader darkreader--invert'].includes(className)) {
                        createShadowStaticStyleOverridesInner(root);
                        return;
                    }
                }
            }
        }
    });
    observer.observe(root, {childList: true});
}

function createShadowStaticStyleOverrides(root: ShadowRoot) {
    // The shadow DOM may not be populated yet and the custom element implementation
    // may assume that unpopulated shadow root is empty and inadvertently remove
    // Dark Reader's overrides
    const delayed = root.firstChild === null;
    createShadowStaticStyleOverridesInner(root);
    if (delayed) {
        delayedCreateShadowStaticStyleOverrides(root);
    }
}

function replaceCSSTemplates($cssText: string) {
    return $cssText.replace(/\${(.+?)}/g, (_, $color) => {
        const color = parseColorWithCache($color);
        if (color) {
            return modifyColor(color, theme!);
        }
        logWarn("Couldn't parse CSSTemplate's color.");
        return $color;
    });
}

function cleanFallbackStyle() {
    const fallback = document.querySelector('.darkreader--fallback');
    if (fallback) {
        fallback.textContent = '';
    }
}

function createDynamicStyleOverrides() {
    cancelRendering();

    const allStyles = getManageableStyles(document);

    const newManagers = allStyles
        .filter((style) => !styleManagers.has(style))
        .map((style) => createManager(style));
    newManagers
        .map((manager) => manager.details({secondRound: false}))
        .filter((detail) => detail && detail.rules.length > 0)
        .forEach((detail) => {
            variablesStore.addRulesForMatching(detail!.rules);
        });

    variablesStore.matchVariablesAndDependents();
    variablesStore.setOnRootVariableChange(() => {
        const rootVarsStyle = createOrUpdateStyle('darkreader--root-vars');
        variablesStore.putRootVars(rootVarsStyle, theme!);
    });
    const rootVarsStyle = createOrUpdateStyle('darkreader--root-vars');
    variablesStore.putRootVars(rootVarsStyle, theme!);

    styleManagers.forEach((manager) => manager.render(theme!, ignoredImageAnalysisSelectors!));
    if (loadingStyles.size === 0) {
        cleanFallbackStyle();
    }
    newManagers.forEach((manager) => manager.watch());

    const inlineStyleElements = toArray(document.querySelectorAll(INLINE_STYLE_SELECTOR));
    iterateShadowHosts(document.documentElement, (host) => {
        createShadowStaticStyleOverrides(host.shadowRoot!);
        const elements = host.shadowRoot!.querySelectorAll(INLINE_STYLE_SELECTOR);
        if (elements.length > 0) {
            push(inlineStyleElements, elements);
        }
    });
    inlineStyleElements.forEach((el: HTMLElement) => overrideInlineStyle(el, theme!, ignoredInlineSelectors, ignoredImageAnalysisSelectors));
    handleAdoptedStyleSheets(document);
    variablesStore.matchVariablesAndDependents();

    if (isFirefox) {
        const MATCH_VAR = Symbol();

        const onAdoptedCSSChange = (e: CustomEvent) => {
            const {node, id, cssRules, entries} = e.detail;
            if (Array.isArray(entries)) {
                entries.forEach((e) => {
                    const cssRules = e[2];
                    variablesStore.addRulesForMatching(cssRules);
                });
                variablesStore.matchVariablesAndDependents();
            } else if (cssRules) {
                variablesStore.addRulesForMatching(cssRules);
                requestAnimationFrameOnce(MATCH_VAR, () => variablesStore.matchVariablesAndDependents());
            }
            const tuples = Array.isArray(entries) ? entries : node && cssRules ? [[node, id, cssRules]] : [];
            tuples.forEach(([node, id, cssRules]) => {
                adoptedStyleNodeIds.set(node, id);
                const fallback = getAdoptedStyleSheetFallback(node);
                fallback.updateCSS(cssRules);
            });
        };

        document.addEventListener('__darkreader__adoptedStyleSheetsChange', onAdoptedCSSChange);
        cleaners.push(() => document.removeEventListener('__darkreader__adoptedStyleSheetsChange', onAdoptedCSSChange));

        document.dispatchEvent(new CustomEvent('__darkreader__startAdoptedStyleSheetsWatcher'));
    }
}

let loadingStylesCounter = 0;
const loadingStyles = new Set<number>();

function createManager(element: StyleElement) {
    const loadingStyleId = ++loadingStylesCounter;
    logInfo(`New manager for element, with loadingStyleID ${loadingStyleId}`, element);
    function loadingStart() {
        if (!isDOMReady() || !documentIsVisible()) {
            loadingStyles.add(loadingStyleId);
            logInfo(`Current amount of styles loading: ${loadingStyles.size}`);

            const fallbackStyle = document.querySelector('.darkreader--fallback')!;
            if (!fallbackStyle.textContent) {
                fallbackStyle.textContent = getModifiedFallbackStyle(theme!, {strict: false});
            }
        }
    }

    function loadingEnd() {
        loadingStyles.delete(loadingStyleId);
        logInfo(`Removed loadingStyle ${loadingStyleId}, now awaiting: ${loadingStyles.size}`);
        logInfo(`To-do to be loaded`, loadingStyles);
        if (loadingStyles.size === 0 && isDOMReady()) {
            cleanFallbackStyle();
        }
    }

    function update() {
        const details = manager.details({secondRound: true});
        if (!details) {
            return;
        }
        variablesStore.addRulesForMatching(details.rules);
        variablesStore.matchVariablesAndDependents();
        manager.render(theme!, ignoredImageAnalysisSelectors);
        if (__TEST__) {
            document.dispatchEvent(new CustomEvent('__darkreader__test__dynamicUpdateComplete'));
        }
    }

    const manager = manageStyle(element, {update, loadingStart, loadingEnd});
    styleManagers.set(element, manager);

    return manager;
}

function removeManager(element: StyleElement) {
    const manager = styleManagers.get(element);
    if (manager) {
        manager.destroy();
        styleManagers.delete(element);
    }
}

const throttledRenderAllStyles = throttle((callback?: () => void) => {
    styleManagers.forEach((manager) => manager.render(theme!, ignoredImageAnalysisSelectors));
    adoptedStyleManagers.forEach((manager) => manager.render(theme!, ignoredImageAnalysisSelectors));
    callback && callback();
});

const cancelRendering = function () {
    throttledRenderAllStyles.cancel();
};

function onDOMReady() {
    if (loadingStyles.size === 0) {
        cleanFallbackStyle();
        return;
    }
    logWarn(`DOM is ready, but still have styles being loaded.`, loadingStyles);
}

function runDynamicStyle() {
    createDynamicStyleOverrides();
    watchForUpdates();
}

function createThemeAndWatchForUpdates() {
    createStaticStyleOverrides();

    if (!documentIsVisible() && !theme!.immediateModify) {
        setDocumentVisibilityListener(runDynamicStyle);
    } else {
        runDynamicStyle();
    }

    changeMetaThemeColorWhenAvailable(theme!);
}

function handleAdoptedStyleSheets(node: ShadowRoot | Document) {
    if (isFirefox) {
        const fallback = getAdoptedStyleSheetFallback(node);
        fallback.render(theme!, ignoredImageAnalysisSelectors);
        return;
    }

    if (canHaveAdoptedStyleSheets(node)) {
        node.adoptedStyleSheets.forEach((s) => {
            variablesStore.addRulesForMatching(s.cssRules);
        });
        const newManger = createAdoptedStyleSheetOverride(node);
        adoptedStyleManagers.push(newManger);
        newManger.render(theme!, ignoredImageAnalysisSelectors);
        newManger.watch((sheets) => {
            sheets.forEach((s) => {
                variablesStore.addRulesForMatching(s.cssRules);
            });
            variablesStore.matchVariablesAndDependents();
            newManger.render(theme!, ignoredImageAnalysisSelectors);
        });
    }
}

function getAdoptedStyleChangeToken(node: Document | ShadowRoot) {
    if (adoptedStyleChangeTokens.has(node)) {
        return adoptedStyleChangeTokens.get(node)!;
    }
    const token = Symbol();
    adoptedStyleChangeTokens.set(node, token);
    return token;
}

function getAdoptedStyleSheetFallback(node: Document | ShadowRoot) {
    let fallback = adoptedStyleFallbacks.get(node);
    if (!fallback) {
        fallback = createAdoptedStyleSheetFallback(() => {
            const token = getAdoptedStyleChangeToken(node);
            requestAnimationFrameOnce(token, () => {
                const id = adoptedStyleNodeIds.get(node);
                const commands = fallback?.commands();
                if (!id || !commands) {
                    return;
                }
                const data = {id, commands};
                document.dispatchEvent(new CustomEvent('__darkreader__adoptedStyleSheetCommands', {detail: JSON.stringify(data)}));
            });
        });
        adoptedStyleFallbacks.set(node, fallback);
    }
    return fallback;
}

function watchForUpdates() {
    const managedStyles = Array.from(styleManagers.keys());
    watchForStyleChanges(managedStyles, ({created, updated, removed, moved}) => {
        const stylesToRemove = removed;
        const stylesToManage = created.concat(updated).concat(moved)
            .filter((style) => !styleManagers.has(style));
        const stylesToRestore = moved
            .filter((style) => styleManagers.has(style));
        logInfo(`Styles to be removed:`, stylesToRemove);
        stylesToRemove.forEach((style) => removeManager(style));
        const newManagers = stylesToManage
            .map((style) => createManager(style));
        newManagers
            .map((manager) => manager.details({secondRound: false}))
            .filter((detail) => detail && detail.rules.length > 0)
            .forEach((detail) => {
                variablesStore.addRulesForMatching(detail!.rules);
            });
        variablesStore.matchVariablesAndDependents();
        newManagers.forEach((manager) => manager.render(theme!, ignoredImageAnalysisSelectors));
        newManagers.forEach((manager) => manager.watch());
        stylesToRestore.forEach((style) => styleManagers.get(style)!.restore());
    }, (shadowRoot) => {
        createShadowStaticStyleOverrides(shadowRoot);
        handleAdoptedStyleSheets(shadowRoot);
    });

    watchForInlineStyles((element) => {
        overrideInlineStyle(element, theme!, ignoredInlineSelectors, ignoredImageAnalysisSelectors);
        if (element === document.documentElement) {
            const styleAttr = element.getAttribute('style') || '';
            if (styleAttr.includes('--')) {
                variablesStore.matchVariablesAndDependents();
                const rootVarsStyle = createOrUpdateStyle('darkreader--root-vars');
                variablesStore.putRootVars(rootVarsStyle, theme!);
            }
        }
    }, (root) => {
        createShadowStaticStyleOverrides(root);
        const inlineStyleElements = root.querySelectorAll(INLINE_STYLE_SELECTOR);
        if (inlineStyleElements.length > 0) {
            forEach(inlineStyleElements, (el: HTMLElement) => overrideInlineStyle(el, theme!, ignoredInlineSelectors, ignoredImageAnalysisSelectors));
        }
    });

    addDOMReadyListener(onDOMReady);
}

function stopWatchingForUpdates() {
    styleManagers.forEach((manager) => manager.pause());
    stopStylePositionWatchers();
    stopWatchingForStyleChanges();
    stopWatchingForInlineStyles();
    removeDOMReadyListener(onDOMReady);
    cleanReadyStateCompleteListeners();
}

let metaObserver: MutationObserver;

function addMetaListener() {
    metaObserver = new MutationObserver(() => {
        if (document.querySelector('meta[name="darkreader-lock"]')) {
            metaObserver.disconnect();
            removeDynamicTheme();
        }
    });
    metaObserver.observe(document.head, {childList: true, subtree: true});
}

function createDarkReaderInstanceMarker() {
    const metaElement: HTMLMetaElement = document.createElement('meta');
    metaElement.name = 'darkreader';
    metaElement.content = INSTANCE_ID;
    document.head.appendChild(metaElement);
}

function isAnotherDarkReaderInstanceActive() {
    if (document.querySelector('meta[name="darkreader-lock"]')) {
        return true;
    }

    const meta: HTMLMetaElement | null = document.querySelector('meta[name="darkreader"]');
    if (meta) {
        if (meta.content !== INSTANCE_ID) {
            return true;
        }
        return false;
    }
    createDarkReaderInstanceMarker();
    addMetaListener();
    return false;
}

function selectRelevantFix(documentURL: string, fixes: DynamicThemeFix[]): DynamicThemeFix | null {
    if (!fixes) {
        return null;
    }
    if (fixes.length === 0 || fixes[0].url[0] !== '*') {
        logWarn('selectRelevantFix() failed to construct a single fix', documentURL, fixes);
        return null;
    }

    const relevantFixIndex = findRelevantFix(documentURL, fixes);
    return relevantFixIndex ? combineFixes([fixes[0], fixes[relevantFixIndex]]) : fixes[0];
}

/**
 * TODO: expose this function to API builds via src/api function enable()
 */
export function createOrUpdateDynamicTheme(theme: Theme, dynamicThemeFixes: DynamicThemeFix[], iframe: boolean): void {
    const dynamicThemeFix = selectRelevantFix(document.location.href, dynamicThemeFixes);

    // Most websites will have only the generic fix applied ('*'), some will have generic fix and one site-specific fix (two in total),
    // and very few will have multiple site-specific fixes
    // TODO: add a navigation listener here for this case

    createOrUpdateDynamicThemeInternal(theme, dynamicThemeFix, iframe);
}

/**
 * Note: This function should be directly used only in API builds, it is exported by this fle
 * only for use in src/api/enable() for backwards compatibility,
 * extension should use only createOrUpdateDynamicTheme()
 */
export function createOrUpdateDynamicThemeInternal(themeConfig: Theme, dynamicThemeFixes: DynamicThemeFix | null, iframe: boolean): void {
    theme = themeConfig;
    fixes = dynamicThemeFixes;
    if (fixes) {
        ignoredImageAnalysisSelectors = Array.isArray(fixes.ignoreImageAnalysis) ? fixes.ignoreImageAnalysis : [];
        ignoredInlineSelectors = Array.isArray(fixes.ignoreInlineStyle) ? fixes.ignoreInlineStyle : [];
    } else {
        ignoredImageAnalysisSelectors = [];
        ignoredInlineSelectors = [];
    }

    if (theme.immediateModify) {
        setIsDOMReady(() => {
            return true;
        });
    }

    isIFrame = iframe;
    if (document.head) {
        if (isAnotherDarkReaderInstanceActive()) {
            removeDynamicTheme();
            return;
        }
        document.documentElement.setAttribute('data-darkreader-mode', 'dynamic');
        document.documentElement.setAttribute('data-darkreader-scheme', theme.mode ? 'dark' : 'dimmed');
        createThemeAndWatchForUpdates();
    } else {
        if (!isFirefox) {
            const fallbackStyle = createOrUpdateStyle('darkreader--fallback');
            document.documentElement.appendChild(fallbackStyle);
            fallbackStyle.textContent = getModifiedFallbackStyle(theme, {strict: true});
        }

        const headObserver = new MutationObserver(() => {
            if (document.head) {
                headObserver.disconnect();
                if (isAnotherDarkReaderInstanceActive()) {
                    removeDynamicTheme();
                    return;
                }
                createThemeAndWatchForUpdates();
            }
        });
        headObserver.observe(document, {childList: true, subtree: true});
    }
}

function removeProxy() {
    document.dispatchEvent(new CustomEvent('__darkreader__cleanUp'));
    removeNode(document.head.querySelector('.darkreader--proxy'));
}

const cleaners: Array<() => void> = [];

export function removeDynamicTheme(): void {
    document.documentElement.removeAttribute(`data-darkreader-mode`);
    document.documentElement.removeAttribute(`data-darkreader-scheme`);
    cleanDynamicThemeCache();
    removeNode(document.querySelector('.darkreader--fallback'));
    if (document.head) {
        restoreMetaThemeColor();
        removeNode(document.head.querySelector('.darkreader--user-agent'));
        removeNode(document.head.querySelector('.darkreader--text'));
        removeNode(document.head.querySelector('.darkreader--invert'));
        removeNode(document.head.querySelector('.darkreader--inline'));
        removeNode(document.head.querySelector('.darkreader--override'));
        removeNode(document.head.querySelector('.darkreader--variables'));
        removeNode(document.head.querySelector('.darkreader--root-vars'));
        removeNode(document.head.querySelector('meta[name="darkreader"]'));
        removeProxy();
    }
    shadowRootsWithOverrides.forEach((root) => {
        removeNode(root.querySelector('.darkreader--inline'));
        removeNode(root.querySelector('.darkreader--override'));
    });
    shadowRootsWithOverrides.clear();
    forEach(styleManagers.keys(), (el) => removeManager(el));
    loadingStyles.clear();
    cleanLoadingLinks();
    forEach(document.querySelectorAll('.darkreader'), removeNode);

    adoptedStyleManagers.forEach((manager) => manager.destroy());
    adoptedStyleManagers.splice(0);
    adoptedStyleFallbacks.forEach((fallback) => fallback.destroy());
    adoptedStyleFallbacks.clear();

    metaObserver && metaObserver.disconnect();

    cleaners.forEach((clean) => clean());
    cleaners.splice(0);
}

export function cleanDynamicThemeCache(): void {
    variablesStore.clear();
    parsedURLCache.clear();
    removeDocumentVisibilityListener();
    cancelRendering();
    stopWatchingForUpdates();
    cleanModificationCache();
    clearColorCache();
}
