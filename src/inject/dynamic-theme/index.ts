import {overrideInlineStyle, getInlineOverrideStyle, watchForInlineStyles, stopWatchingForInlineStyles, INLINE_STYLE_SELECTOR} from './inline-style';
import {changeMetaThemeColorWhenAvailable, restoreMetaThemeColor} from './meta-theme-color';
import {getModifiedUserAgentStyle, getModifiedFallbackStyle, cleanModificationCache, getSelectionColor} from './modify-css';
import type {StyleElement, StyleManager} from './style-manager';
import {manageStyle, getManageableStyles, cleanLoadingLinks} from './style-manager';
import {watchForStyleChanges, stopWatchingForStyleChanges} from './watch';
import {forEach, push, toArray} from '../../utils/array';
import {removeNode, watchForNodePosition, iterateShadowHosts, isDOMReady, removeDOMReadyListener, cleanReadyStateCompleteListeners, addDOMReadyListener, setIsDOMReady} from '../utils/dom';
import {logInfo, logWarn} from '../utils/log';
import {throttle} from '../../utils/throttle';
import {clamp} from '../../utils/math';
import {getCSSFilterValue} from '../../generators/css-filter';
import {modifyBackgroundColor, modifyColor, modifyForegroundColor} from '../../generators/modify-colors';
import {createTextStyle} from '../../generators/text-style';
import type {FilterConfig, DynamicThemeFix} from '../../definitions';
import {generateUID} from '../../utils/uid';
import type {AdoptedStyleSheetManager} from './adopted-style-manger';
import {createAdoptedStyleSheetOverride} from './adopted-style-manger';
import {isFirefox} from '../../utils/platform';
import {injectProxy} from './stylesheet-proxy';
import {clearColorCache, parseColorWithCache} from '../../utils/color';
import {parsedURLCache} from '../../utils/url';
import {variablesStore} from './variables';
import {setDocumentVisibilityListener, documentIsVisible, removeDocumentVisibilityListener} from '../../utils/visibility';
import {combineFixes, findRelevantFix} from './fixes';

declare const __TEST__: boolean;
declare const __CHROMIUM_MV3__: boolean;
const INSTANCE_ID = generateUID();
const styleManagers = new Map<StyleElement, StyleManager>();
const adoptedStyleManagers: AdoptedStyleSheetManager[] = [];
let filter: FilterConfig | null = null;
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
    fallbackStyle.textContent = getModifiedFallbackStyle(filter!, {strict: true});
    document.head.insertBefore(fallbackStyle, document.head.firstChild);
    setupNodePositionWatcher(fallbackStyle, 'fallback');

    const userAgentStyle = createOrUpdateStyle('darkreader--user-agent');
    userAgentStyle.textContent = getModifiedUserAgentStyle(filter!, isIFrame!, filter!.styleSystemControls);
    document.head.insertBefore(userAgentStyle, fallbackStyle.nextSibling);
    setupNodePositionWatcher(userAgentStyle, 'user-agent');

    const textStyle = createOrUpdateStyle('darkreader--text');
    if (filter!.useFont || filter!.textStroke > 0) {
        textStyle.textContent = createTextStyle(filter!);
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
                ...filter!,
                contrast: filter!.mode === 0 ? filter!.contrast : clamp(filter!.contrast - 10, 0, 100),
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
    const selectionColors = getSelectionColor(filter!);
    const {darkSchemeBackgroundColor, darkSchemeTextColor, lightSchemeBackgroundColor, lightSchemeTextColor, mode} = filter!;
    let schemeBackgroundColor = mode === 0 ? lightSchemeBackgroundColor : darkSchemeBackgroundColor;
    let schemeTextColor = mode === 0 ? lightSchemeTextColor : darkSchemeTextColor;
    schemeBackgroundColor = modifyBackgroundColor(parseColorWithCache(schemeBackgroundColor)!, filter!);
    schemeTextColor = modifyForegroundColor(parseColorWithCache(schemeTextColor)!, filter!);
    variableStyle.textContent = [
        `:root {`,
        `   --darkreader-neutral-background: ${schemeBackgroundColor};`,
        `   --darkreader-neutral-text: ${schemeTextColor};`,
        `   --darkreader-selection-background: ${selectionColors.backgroundColorSelection};`,
        `   --darkreader-selection-text: ${selectionColors.foregroundColorSelection};`,
        `}`
    ].join('\n');
    document.head.insertBefore(variableStyle, inlineStyle.nextSibling);
    setupNodePositionWatcher(variableStyle, 'variables');

    const rootVarsStyle = createOrUpdateStyle('darkreader--root-vars');
    document.head.insertBefore(rootVarsStyle, variableStyle.nextSibling);

    const enableStyleSheetsProxy = !(fixes && fixes.disableStyleSheetsProxy);
    const enableCustomElementRegistryProxy = !(fixes && fixes.disableCustomElementRegistryProxy);
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
                ...filter!,
                contrast: filter!.mode === 0 ? filter!.contrast : clamp(filter!.contrast - 10, 0, 100),
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
        // Disconnect observer immediatelly before making any other changes
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
    const uninit = root.firstChild === null;
    createShadowStaticStyleOverridesInner(root);
    if (uninit) {
        delayedCreateShadowStaticStyleOverrides(root);
    }
}

function replaceCSSTemplates($cssText: string) {
    return $cssText.replace(/\${(.+?)}/g, (_, $color) => {
        const color = parseColorWithCache($color);
        if (color) {
            return modifyColor(color, filter!);
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

    variablesStore.matchVariablesAndDependants();
    variablesStore.setOnRootVariableChange(() => {
        const rootVarsStyle = createOrUpdateStyle('darkreader--root-vars');
        variablesStore.putRootVars(rootVarsStyle, filter!);
    });
    const rootVarsStyle = createOrUpdateStyle('darkreader--root-vars');
    variablesStore.putRootVars(rootVarsStyle, filter!);

    styleManagers.forEach((manager) => manager.render(filter!, ignoredImageAnalysisSelectors!));
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
    inlineStyleElements.forEach((el: HTMLElement) => overrideInlineStyle(el, filter!, ignoredInlineSelectors, ignoredImageAnalysisSelectors));
    handleAdoptedStyleSheets(document);
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
                fallbackStyle.textContent = getModifiedFallbackStyle(filter!, {strict: false});
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
        variablesStore.matchVariablesAndDependants();
        manager.render(filter!, ignoredImageAnalysisSelectors);
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
    styleManagers.forEach((manager) => manager.render(filter!, ignoredImageAnalysisSelectors));
    adoptedStyleManagers.forEach((manager) => manager.render(filter!, ignoredImageAnalysisSelectors));
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

    if (!documentIsVisible() && !filter!.immediateModify) {
        setDocumentVisibilityListener(runDynamicStyle);
    } else {
        runDynamicStyle();
    }

    changeMetaThemeColorWhenAvailable(filter!);
}

function handleAdoptedStyleSheets(node: ShadowRoot | Document) {
    try {
        if (Array.isArray(node.adoptedStyleSheets)) {
            if (node.adoptedStyleSheets.length > 0) {
                const newManger = createAdoptedStyleSheetOverride(node);

                adoptedStyleManagers.push(newManger);
                newManger.render(filter!, ignoredImageAnalysisSelectors);
            }
        }
    } catch (err) {
        // For future readers, Dark Reader typically does not use 'try/catch' in its
        // code, but this exception is due to a problem in Firefox Nightly and does
        // not cause any consequences.
        // Ref: https://github.com/darkreader/darkreader/issues/8789#issuecomment-1114210080
        logWarn('Error occurred in handleAdoptedStyleSheets: ', err);
    }
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
        variablesStore.matchVariablesAndDependants();
        newManagers.forEach((manager) => manager.render(filter!, ignoredImageAnalysisSelectors));
        newManagers.forEach((manager) => manager.watch());
        stylesToRestore.forEach((style) => styleManagers.get(style)!.restore());
    }, (shadowRoot) => {
        createShadowStaticStyleOverrides(shadowRoot);
        handleAdoptedStyleSheets(shadowRoot);
    });

    watchForInlineStyles((element) => {
        overrideInlineStyle(element, filter!, ignoredInlineSelectors, ignoredImageAnalysisSelectors);
        if (element === document.documentElement) {
            const styleAttr = element.getAttribute('style') || '';
            if (styleAttr.includes('--')) {
                variablesStore.matchVariablesAndDependants();
                const rootVarsStyle = createOrUpdateStyle('darkreader--root-vars');
                variablesStore.putRootVars(rootVarsStyle, filter!);
            }
        }
    }, (root) => {
        createShadowStaticStyleOverrides(root);
        const inlineStyleElements = root.querySelectorAll(INLINE_STYLE_SELECTOR);
        if (inlineStyleElements.length > 0) {
            forEach(inlineStyleElements, (el: HTMLElement) => overrideInlineStyle(el, filter!, ignoredInlineSelectors, ignoredImageAnalysisSelectors));
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
export function createOrUpdateDynamicTheme(filterConfig: FilterConfig, dynamicThemeFixes: DynamicThemeFix[], iframe: boolean): void {
    const dynamicThemeFix = selectRelevantFix(document.location.href, dynamicThemeFixes);

    // Most websites will have only the generic fix applied ('*'), some will have generic fix and one site-specific fix (two in total),
    // and very few will have multple site-specific fixes
    // TODO: add a navigation listener here for this case

    createOrUpdateDynamicThemeInternal(filterConfig, dynamicThemeFix, iframe);
}

/**
 * Note: This function should be directly used only in API builds, it is exported by this fle
 * only for use in src/api/enable() for backwards compatibility,
 * extension should use only createOrUpdateDynamicTheme()
 */
export function createOrUpdateDynamicThemeInternal(filterConfig: FilterConfig, dynamicThemeFixes: DynamicThemeFix | null, iframe: boolean): void {
    filter = filterConfig;
    fixes = dynamicThemeFixes;
    if (fixes) {
        ignoredImageAnalysisSelectors = Array.isArray(fixes.ignoreImageAnalysis) ? fixes.ignoreImageAnalysis : [];
        ignoredInlineSelectors = Array.isArray(fixes.ignoreInlineStyle) ? fixes.ignoreInlineStyle : [];
    } else {
        ignoredImageAnalysisSelectors = [];
        ignoredInlineSelectors = [];
    }

    if (filter.immediateModify) {
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
        document.documentElement.setAttribute('data-darkreader-scheme', filter.mode ? 'dark' : 'dimmed');
        createThemeAndWatchForUpdates();
    } else {
        if (!isFirefox) {
            const fallbackStyle = createOrUpdateStyle('darkreader--fallback');
            document.documentElement.appendChild(fallbackStyle);
            fallbackStyle.textContent = getModifiedFallbackStyle(filter, {strict: true});
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

    adoptedStyleManagers.forEach((manager) => {
        manager.destroy();
    });
    adoptedStyleManagers.splice(0);

    metaObserver && metaObserver.disconnect();
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
