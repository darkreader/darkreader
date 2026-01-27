import type {Theme, DynamicThemeFix} from '../../definitions';
import {getCSSFilterValue} from '../../generators/css-filter';
import {createTextStyle} from '../../generators/text-style';
import {forEach, push, toArray} from '../../utils/array';
import {clearColorCache, getSRGBLightness, parseColorWithCache} from '../../utils/color';
import {clamp} from '../../utils/math';
import {isFirefox} from '../../utils/platform';
import {requestAnimationFrameOnce, throttle} from '../../utils/throttle';
import {generateUID} from '../../utils/uid';
import {parsedURLCache} from '../../utils/url';
import {setDocumentVisibilityListener, documentIsVisible, removeDocumentVisibilityListener} from '../../utils/visibility';
import {removeNode, watchForNodePosition, iterateShadowHosts, isDOMReady, removeDOMReadyListener, cleanReadyStateCompleteListeners, addDOMReadyListener, setIsDOMReady} from '../utils/dom';
import {logInfo, logWarn} from '../utils/log';

import type {AdoptedStyleSheetManager, AdoptedStyleSheetFallback} from './adopted-style-manger';
import {createAdoptedStyleSheetOverride, createAdoptedStyleSheetFallback, canHaveAdoptedStyleSheets} from './adopted-style-manger';
import {combineFixes, findRelevantFix} from './fixes';
import {getStyleInjectionMode, injectStyleAway, removeStyleContainer} from './injection';
import {overrideInlineStyle, getInlineOverrideStyle, watchForInlineStyles, stopWatchingForInlineStyles, INLINE_STYLE_SELECTOR} from './inline-style';
import {changeMetaThemeColorWhenAvailable, restoreMetaThemeColor} from './meta-theme-color';
import {modifyBackgroundColor, modifyBorderColor, modifyForegroundColor} from './modify-colors';
import {getModifiedUserAgentStyle, getModifiedFallbackStyle, cleanModificationCache, getSelectionColor} from './modify-css';
import {clearColorPalette, getColorPalette, registerVariablesSheet, releaseVariablesSheet} from './palette';
import type {StyleElement, StyleManager} from './style-manager';
import {manageStyle, getManageableStyles, cleanLoadingLinks, setIgnoredCSSURLs} from './style-manager';
import {injectProxy} from './stylesheet-proxy';
import {variablesStore} from './variables';
import {watchForStyleChanges, stopWatchingForStyleChanges} from './watch';

export {createFallbackFactory} from './modify-css';

declare const __TEST__: boolean;
declare const __CHROMIUM_MV3__: boolean;
const INSTANCE_ID = generateUID();
const styleManagers = new Map<StyleElement, StyleManager>();
const adoptedStyleManagers: AdoptedStyleSheetManager[] = [];
const adoptedStyleFallbacks = new Map<CSSStyleSheet, AdoptedStyleSheetFallback>();
const adoptedStyleChangeTokens = new WeakMap<CSSStyleSheet, symbol>();
let theme: Theme | null = null;
let fixes: DynamicThemeFix | null = null;
let isIFrame: boolean | null = null;
let ignoredImageAnalysisSelectors: string[] = [];
let ignoredInlineSelectors: string[] = [];

let staticStyleMap = new WeakMap<ParentNode, Map<string, HTMLStyleElement>>();

function createOrUpdateStyle(className: string, root: ParentNode = document.head || document): HTMLStyleElement {
    let element: HTMLStyleElement | null = root.querySelector(`.${className}`);
    if (!staticStyleMap.has(root)) {
        staticStyleMap.set(root, new Map());
    }
    const classMap = staticStyleMap.get(root)!;
    if (element) {
        classMap.set(className, element);
    } else if (classMap.has(className)) {
        element = classMap.get(className)!;
    } else {
        element = document.createElement('style');
        element.classList.add('darkreader');
        element.classList.add(className);
        element.media = 'screen';
        element.textContent = '';
        classMap.set(className, element);
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

const nodePositionWatchers = new Map<string, ReturnType<typeof watchForNodePosition>>();

function setupNodePositionWatcher(node: Node, alias: string, callback?: () => void) {
    nodePositionWatchers.has(alias) && nodePositionWatchers.get(alias)!.stop();
    nodePositionWatchers.set(alias, watchForNodePosition(node, 'head', callback));
}

function stopStylePositionWatchers() {
    forEach(nodePositionWatchers.values(), (watcher) => watcher.stop());
    nodePositionWatchers.clear();
}

function injectStaticStyle(style: HTMLStyleElement, prevNode: Node | null, watchAlias: string, callback?: () => void) {
    const mode = getStyleInjectionMode();
    if (mode === 'next') {
        document.head.insertBefore(style, prevNode ? prevNode.nextSibling : document.head.firstChild);
        setupNodePositionWatcher(style, watchAlias, callback);
    } else if (mode === 'away') {
        injectStyleAway(style);
    }
}

function createStaticStyleOverrides() {
    const fallbackStyle = createOrUpdateStyle('darkreader--fallback', document);
    fallbackStyle.textContent = getModifiedFallbackStyle(theme!, {strict: true});
    injectStaticStyle(fallbackStyle, null, 'fallback');

    const userAgentStyle = createOrUpdateStyle('darkreader--user-agent');
    userAgentStyle.textContent = getModifiedUserAgentStyle(theme!, isIFrame!, theme!.styleSystemControls);
    injectStaticStyle(userAgentStyle, fallbackStyle, 'user-agent');

    const textStyle = createOrUpdateStyle('darkreader--text');
    if (theme!.useFont || theme!.textStroke > 0) {
        textStyle.textContent = createTextStyle(theme!);
    } else {
        textStyle.textContent = '';
    }
    injectStaticStyle(textStyle, userAgentStyle, 'text');

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
    injectStaticStyle(invertStyle, textStyle, 'invert');

    const inlineStyle = createOrUpdateStyle('darkreader--inline');
    inlineStyle.textContent = getInlineOverrideStyle();
    injectStaticStyle(inlineStyle, invertStyle, 'inline');

    const variableStyle = createOrUpdateStyle('darkreader--variables');
    const selectionColors = theme?.selectionColor ? getSelectionColor(theme) : null;
    const neutralBackgroundColor = modifyBackgroundColor(parseColorWithCache('#ffffff')!, theme!);
    const neutralTextColor = modifyForegroundColor(parseColorWithCache('#000000')!, theme!);
    variableStyle.textContent = [
        `:root {`,
        `   --darkreader-neutral-background: ${neutralBackgroundColor};`,
        `   --darkreader-neutral-text: ${neutralTextColor};`,
        `   --darkreader-selection-background: ${selectionColors?.backgroundColorSelection ?? 'initial'};`,
        `   --darkreader-selection-text: ${selectionColors?.foregroundColorSelection ?? 'initial'};`,
        `}`,
    ].join('\n');
    injectStaticStyle(variableStyle, inlineStyle, 'variables', () => registerVariablesSheet(variableStyle.sheet!));
    registerVariablesSheet(variableStyle.sheet!);

    const rootVarsStyle = createOrUpdateStyle('darkreader--root-vars');
    injectStaticStyle(rootVarsStyle, variableStyle, 'root-vars');

    const enableStyleSheetsProxy = !(fixes && fixes.disableStyleSheetsProxy);
    const enableCustomElementRegistryProxy = !(fixes && fixes.disableCustomElementRegistryProxy);
    document.dispatchEvent(new CustomEvent('__darkreader__cleanUp'));
    if (__CHROMIUM_MV3__) {
        // Notify the dedicated injector of the data.
        document.dispatchEvent(new CustomEvent('__darkreader__stylesheetProxy__arg', {detail: {enableStyleSheetsProxy, enableCustomElementRegistryProxy}}));
    } else {
        const proxyScript = createOrUpdateScript('darkreader--proxy');
        proxyScript.append(`(${injectProxy})(${enableStyleSheetsProxy}, ${enableCustomElementRegistryProxy})`);
        document.head.insertBefore(proxyScript, rootVarsStyle.nextSibling);
        proxyScript.remove();
    }

    const overrideStyle = createOrUpdateStyle('darkreader--override');
    overrideStyle.textContent = fixes && fixes.css ? replaceCSSTemplates(fixes.css) : '';
    injectStaticStyle(overrideStyle, document.head.lastChild, 'override');
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
            const lightness = getSRGBLightness(color.r, color.g, color.b);
            if (lightness > 0.5) {
                return modifyBackgroundColor(color, theme!);
            }
            return modifyForegroundColor(color, theme!);
        }
        logWarn("Couldn't parse CSSTemplate's color.");
        return $color;
    });
}

function cleanFallbackStyle() {
    const fallback = (
        staticStyleMap.get(document.head)?.get('darkreader--fallback') ||
        staticStyleMap.get(document)?.get('darkreader--fallback') ||
        document.querySelector('.darkreader--fallback')
    );
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
        type NodeSheet = {
            sheetId: number;
            sheet: CSSStyleSheet;
        };

        const onAdoptedCssChange = (e: CustomEvent) => {
            const {sheets} = e.detail;
            if (!Array.isArray(sheets) || sheets.length === 0) {
                return;
            }
            sheets.forEach(({sheet}: NodeSheet) => {
                const {cssRules} = sheet;
                variablesStore.addRulesForMatching(cssRules);
            });
            variablesStore.matchVariablesAndDependents();
            const response: Array<{sheetId: number; commands: any}> = [];
            sheets.forEach(({sheetId, sheet}: NodeSheet) => {
                const fallback = getAdoptedStyleSheetFallback(sheet);
                const cssRules = sheet.cssRules;
                fallback.render({
                    theme: theme!,
                    ignoreImageAnalysis: ignoredImageAnalysisSelectors!,
                    cssRules,
                });
                const commands = fallback.commands();
                response.push({sheetId, commands});
            });

            requestAnimationFrameOnce(getAdoptedStyleChangeToken(sheets[0].sheet), () => {
                document.dispatchEvent(new CustomEvent('__darkreader__adoptedStyleSheetCommands', {detail: JSON.stringify(response)}));
            });
        };

        document.addEventListener('__darkreader__adoptedStyleSheetsChange', onAdoptedCssChange);
        cleaners.push(() => document.removeEventListener('__darkreader__adoptedStyleSheetsChange', onAdoptedCssChange));

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

            const fallbackStyle = createOrUpdateStyle('darkreader--fallback');
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

function getAdoptedStyleChangeToken(sheet: CSSStyleSheet) {
    if (adoptedStyleChangeTokens.has(sheet)) {
        return adoptedStyleChangeTokens.get(sheet)!;
    }
    const token = Symbol();
    adoptedStyleChangeTokens.set(sheet, token);
    return token;
}

function getAdoptedStyleSheetFallback(sheet: CSSStyleSheet) {
    let fallback = adoptedStyleFallbacks.get(sheet);
    if (!fallback) {
        fallback = createAdoptedStyleSheetFallback();
        adoptedStyleFallbacks.set(sheet, fallback);
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
let headObserver: MutationObserver | null = null;

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

function isDRLocked() {
    return document.querySelector('meta[name="darkreader-lock"]') != null;
}

function isAnotherDarkReaderInstanceActive() {
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

// Give them a second chance,
// but never a third
let interceptorAttempts = 2;

function interceptOldScript({success, failure}: {success: () => void; failure: () => void}) {
    if (--interceptorAttempts <= 0) {
        failure();
        return;
    }

    const oldMeta = document.head.querySelector('meta[name="darkreader"]') as HTMLMetaElement | null;
    if (!oldMeta || oldMeta.content === INSTANCE_ID) {
        return;
    }

    const lock = document.createElement('meta');
    lock.name = 'darkreader-lock';
    document.head.append(lock);
    queueMicrotask(() => {
        lock.remove();
        success();
    });
}

function disableConflictingPlugins() {
    if (document.documentElement.hasAttribute('data-wp-dark-mode-preset')) {
        const disableWPDarkMode = () => {
            document.dispatchEvent(new CustomEvent('__darkreader__disableConflictingPlugins'));
            document.documentElement.classList.remove('wp-dark-mode-active');
            document.documentElement.removeAttribute('data-wp-dark-mode-active');
        };
        disableWPDarkMode();
        const observer = new MutationObserver(() => {
            if (
                document.documentElement.classList.contains('wp-dark-mode-active') ||
                document.documentElement.hasAttribute('data-wp-dark-mode-active')
            ) {
                disableWPDarkMode();
            }
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-wp-dark-mode-active'],
        });
    }
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

let prevTheme: Theme | null = null;
let prevFixes: DynamicThemeFix | null = null;

/**
 * Note: This function should be directly used only in API builds, it is exported by this fle
 * only for use in src/api/enable() for backwards compatibility,
 * extension should use only createOrUpdateDynamicTheme()
 */
export function createOrUpdateDynamicThemeInternal(themeConfig: Theme, dynamicThemeFixes: DynamicThemeFix | null, iframe: boolean): void {
    theme = themeConfig;
    fixes = dynamicThemeFixes;

    const colorAffectingKeys: Array<keyof Theme> = [
        'brightness',
        'contrast',
        'darkSchemeBackgroundColor',
        'darkSchemeTextColor',
        'grayscale',
        'lightSchemeBackgroundColor',
        'lightSchemeTextColor',
        'sepia',
    ];

    if (prevTheme && prevFixes) {
        const themeKeys = new Set<keyof Theme>([
            ...(Object.keys(theme) as Array<keyof Theme>),
            ...(Object.keys(prevTheme) as Array<keyof Theme>),
        ]);

        let onlyColorsChanged = true;
        for (const key of themeKeys) {
            if (theme[key] !== prevTheme[key] && !colorAffectingKeys.includes(key)) {
                onlyColorsChanged = false;
                break;
            }
        }

        if (onlyColorsChanged && JSON.stringify(fixes) !== JSON.stringify(prevFixes)) {
            onlyColorsChanged = false;
        }

        if (onlyColorsChanged) {
            const palette = getColorPalette();
            clearColorPalette();
            palette.background.forEach((color) => modifyBackgroundColor(color, theme!));
            palette.text.forEach((color) => modifyForegroundColor(color, theme!));
            palette.border.forEach((color) => modifyBorderColor(color, theme!));
            return;
        }

        clearColorPalette();
    }

    if (fixes) {
        ignoredImageAnalysisSelectors = Array.isArray(fixes.ignoreImageAnalysis) ? fixes.ignoreImageAnalysis : [];
        ignoredInlineSelectors = Array.isArray(fixes.ignoreInlineStyle) ? fixes.ignoreInlineStyle : [];
        setIgnoredCSSURLs(Array.isArray(fixes.ignoreCSSUrl) ? fixes.ignoreCSSUrl : []);
    } else {
        ignoredImageAnalysisSelectors = [];
        ignoredInlineSelectors = [];
        setIgnoredCSSURLs([]);
    }

    if (theme.immediateModify) {
        setIsDOMReady(() => {
            return true;
        });
    }

    isIFrame = iframe;

    const ready = () => {
        const success = () => {
            disableConflictingPlugins();
            document.documentElement.setAttribute('data-darkreader-mode', 'dynamic');
            document.documentElement.setAttribute('data-darkreader-scheme', theme!.mode ? 'dark' : 'dimmed');
            createThemeAndWatchForUpdates();
        };

        const failure = () => {
            removeDynamicTheme();
        };

        if (isDRLocked()) {
            removeNode(document.querySelector('.darkreader--fallback'));
        } else if (isAnotherDarkReaderInstanceActive()) {
            interceptOldScript({
                success,
                failure,
            });
        } else {
            success();
        }
    };

    if (document.head) {
        ready();
    } else {
        if (!isFirefox) {
            const fallbackStyle = createOrUpdateStyle('darkreader--fallback');
            document.documentElement.appendChild(fallbackStyle);
            fallbackStyle.textContent = getModifiedFallbackStyle(theme, {strict: true});
        }

        headObserver?.disconnect();
        headObserver = new MutationObserver(() => {
            if (document.head) {
                headObserver?.disconnect();
                ready();
            }
        });
        cleaners.push(() => {
            headObserver?.disconnect();
            headObserver = null;
        });
        headObserver.observe(document, {childList: true, subtree: true});
    }

    prevTheme = theme;
    prevFixes = fixes;
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
        const selectors = [
            '.darkreader--user-agent',
            '.darkreader--text',
            '.darkreader--invert',
            '.darkreader--inline',
            '.darkreader--override',
            '.darkreader--variables',
            '.darkreader--root-vars',
            'meta[name="darkreader"]',
        ];

        restoreMetaThemeColor();
        selectors.forEach((selector) => removeNode(document.head.querySelector(selector)));
        staticStyleMap = new WeakMap();
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
    removeStyleContainer();

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
    releaseVariablesSheet();
    prevTheme = null;
    prevFixes = null;
}
