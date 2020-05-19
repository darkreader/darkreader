import {replaceCSSVariables, getElementCSSVariables} from './css-rules';
import {overrideInlineStyle, getInlineOverrideStyle, watchForInlineStyles, stopWatchingForInlineStyles, INLINE_STYLE_SELECTOR} from './inline-style';
import {changeMetaThemeColorWhenAvailable, restoreMetaThemeColor} from './meta-theme-color';
import {getModifiedUserAgentStyle, getModifiedFallbackStyle, cleanModificationCache, parseColorWithCache} from './modify-css';
import {manageStyle, getManageableStyles, StyleElement, StyleManager} from './style-manager';
import {watchForStyleChanges, stopWatchingForStyleChanges} from './watch';
import {forEach, push, toArray} from '../../utils/array';
import {removeNode, watchForNodePosition, iterateShadowNodes, isDOMReady, addDOMReadyListener, removeDOMReadyListener} from '../utils/dom';
import {logWarn} from '../utils/log';
import {throttle} from '../utils/throttle';
import {clamp} from '../../utils/math';
import {isFirefox} from '../../utils/platform';
import {getCSSFilterValue} from '../../generators/css-filter';
import {modifyColor} from '../../generators/modify-colors';
import {createTextStyle} from '../../generators/text-style';
import {FilterConfig, DynamicThemeFix} from '../../definitions';

const styleManagers = new Map<StyleElement, StyleManager>();
const variables = new Map<string, string>();
let filter: FilterConfig = null;
let fixes: DynamicThemeFix = null;
let isIFrame: boolean = null;

function createOrUpdateStyle(className: string, root: ParentNode = document.head || document) {
    let style = root.querySelector(`.${className}`) as HTMLStyleElement;
    if (!style) {
        style = document.createElement('style');
        style.classList.add('darkreader');
        style.classList.add(className);
        style.media = 'screen';
    }
    return style;
}

const stylePositionWatchers = new Map<string, ReturnType<typeof watchForNodePosition>>();

function setupStylePositionWatcher(node: Node, alias: string) {
    stylePositionWatchers.has(alias) && stylePositionWatchers.get(alias).stop();
    stylePositionWatchers.set(alias, watchForNodePosition(node, {watchParent: true, watchSibling: false}));
}

function stopStylePositionWatchers() {
    forEach(stylePositionWatchers.values(), (watcher) => watcher.stop());
    stylePositionWatchers.clear();
}

function createStaticStyleOverrides() {
    const fallbackStyle = createOrUpdateStyle('darkreader--fallback');
    fallbackStyle.textContent = getModifiedFallbackStyle(filter, {strict: true});
    document.head.insertBefore(fallbackStyle, document.head.firstChild);
    setupStylePositionWatcher(fallbackStyle, 'fallback');

    const userAgentStyle = createOrUpdateStyle('darkreader--user-agent');
    userAgentStyle.textContent = getModifiedUserAgentStyle(filter, isIFrame);
    document.head.insertBefore(userAgentStyle, fallbackStyle.nextSibling);
    setupStylePositionWatcher(userAgentStyle, 'user-agent');

    const textStyle = createOrUpdateStyle('darkreader--text');
    if (filter.useFont || filter.textStroke > 0) {
        textStyle.textContent = createTextStyle(filter);
    } else {
        textStyle.textContent = '';
    }
    document.head.insertBefore(textStyle, fallbackStyle.nextSibling);
    setupStylePositionWatcher(textStyle, 'text');

    const invertStyle = createOrUpdateStyle('darkreader--invert');
    if (fixes && Array.isArray(fixes.invert) && fixes.invert.length > 0) {
        invertStyle.textContent = [
            `${fixes.invert.join(', ')} {`,
            `    filter: ${getCSSFilterValue({
                ...filter,
                contrast: filter.mode === 0 ? filter.contrast : clamp(filter.contrast - 10, 0, 100),
            })} !important;`,
            '}',
        ].join('\n');
    } else {
        invertStyle.textContent = '';
    }
    document.head.insertBefore(invertStyle, textStyle.nextSibling);
    setupStylePositionWatcher(invertStyle, 'invert');

    const inlineStyle = createOrUpdateStyle('darkreader--inline');
    inlineStyle.textContent = getInlineOverrideStyle();
    document.head.insertBefore(inlineStyle, invertStyle.nextSibling);
    setupStylePositionWatcher(inlineStyle, 'inline');

    const overrideStyle = createOrUpdateStyle('darkreader--override');
    overrideStyle.textContent = fixes && fixes.css ? replaceCSSTemplates(fixes.css) : '';
    document.head.appendChild(overrideStyle);
    setupStylePositionWatcher(overrideStyle, 'override');
}

const shadowRootsWithOverrides = new Set<ShadowRoot>();

function createShadowStaticStyleOverrides(root: ShadowRoot) {
    const inlineStyle = createOrUpdateStyle('darkreader--inline', root);
    inlineStyle.textContent = getInlineOverrideStyle();
    root.insertBefore(inlineStyle, root.firstChild);
    shadowRootsWithOverrides.add(root);
}

function replaceCSSTemplates($cssText: string) {
    return $cssText.replace(/\${(.+?)}/g, (m0, $color) => {
        try {
            const color = parseColorWithCache($color);
            return modifyColor(color, filter);
        } catch (err) {
            logWarn(err);
            return $color;
        }
    });
}

function cleanFallbackStyle() {
    const fallback = document.head.querySelector('.darkreader--fallback');
    if (fallback) {
        fallback.textContent = '';
    }
}

function createDynamicStyleOverrides() {
    cancelRendering();

    updateVariables(getElementCSSVariables(document.documentElement));

    const allStyles = getManageableStyles(document);

    const newManagers = allStyles
        .filter((style) => !styleManagers.has(style))
        .map((style) => createManager(style));
    const newVariables = newManagers
        .map((manager) => manager.details())
        .filter((details) => details && details.variables.size > 0)
        .map(({variables}) => variables);
    if (newVariables.length === 0) {
        styleManagers.forEach((manager) => manager.render(filter, variables));
        if (loadingStyles.size === 0) {
            cleanFallbackStyle();
        }
    } else {
        newVariables.forEach((variables) => updateVariables(variables));
        throttledRenderAllStyles(() => {
            if (loadingStyles.size === 0) {
                cleanFallbackStyle();
            }
        });
    }
    newManagers.forEach((manager) => manager.watch());

    const inlineStyleElements = toArray(document.querySelectorAll(INLINE_STYLE_SELECTOR));
    iterateShadowNodes(document.documentElement, (node) => {
        const elements = node.shadowRoot.querySelectorAll(INLINE_STYLE_SELECTOR);
        if (elements.length > 0) {
            createShadowStaticStyleOverrides(node.shadowRoot);
            push(inlineStyleElements, elements);
        }
    });
    inlineStyleElements.forEach((el) => overrideInlineStyle(el as HTMLElement, filter, fixes.ignoreInlineStyle));
}

let loadingStylesCounter = 0;
const loadingStyles = new Set();

function createManager(element: StyleElement) {
    if (styleManagers.has(element)) {
        return;
    }

    const loadingStyleId = ++loadingStylesCounter;

    function loadingStart() {
        if (!isDOMReady() || !didDocumentShowUp) {
            loadingStyles.add(loadingStyleId);

            const fallbackStyle = document.querySelector('.darkreader--fallback');
            if (!fallbackStyle.textContent) {
                fallbackStyle.textContent = getModifiedFallbackStyle(filter, {strict: false});
            }
        }
    }

    function loadingEnd() {
        loadingStyles.delete(loadingStyleId);
        if (loadingStyles.size === 0 && isDOMReady()) {
            cleanFallbackStyle();
        }
    }

    function update() {
        const details = manager.details();
        if (!details) {
            return;
        }
        if (details.variables.size === 0) {
            manager.render(filter, variables);
        } else {
            updateVariables(details.variables);
            throttledRenderAllStyles();
        }
    }

    const manager = manageStyle(element, {update, loadingStart, loadingEnd});
    styleManagers.set(element, manager);

    return manager;
}

function updateVariables(newVars: Map<string, string>) {
    if (newVars.size === 0) {
        return;
    }
    newVars.forEach((value, key) => variables.set(key, value));
    variables.forEach((value, key) => variables.set(key, replaceCSSVariables(value, variables)));
}

function removeManager(element: StyleElement) {
    const manager = styleManagers.get(element);
    if (manager) {
        manager.destroy();
        styleManagers.delete(element);
    }
}

const throttledRenderAllStyles = throttle((callback?: () => void) => {
    styleManagers.forEach((manager) => manager.render(filter, variables));
    callback && callback();
});
const cancelRendering = function () {
    throttledRenderAllStyles.cancel();
};

function onDOMReady() {
    if (loadingStyles.size === 0) {
        cleanFallbackStyle();
    }
}

let documentVisibilityListener: () => void = null;
let didDocumentShowUp = !document.hidden;

function watchForDocumentVisibility(callback: () => void) {
    const alreadyWatching = Boolean(documentVisibilityListener);
    documentVisibilityListener = () => {
        if (!document.hidden) {
            stopWatchingForDocumentVisibility();
            callback();
            didDocumentShowUp = true;
        }
    };
    if (!alreadyWatching) {
        document.addEventListener('visibilitychange', documentVisibilityListener);
    }
}

function stopWatchingForDocumentVisibility() {
    document.removeEventListener('visibilitychange', documentVisibilityListener);
    documentVisibilityListener = null;
}

function createThemeAndWatchForUpdates() {
    createStaticStyleOverrides();

    function runDynamicStyle() {
        createDynamicStyleOverrides();
        watchForUpdates();
    }

    if (document.hidden) {
        watchForDocumentVisibility(runDynamicStyle);
    } else {
        runDynamicStyle();
    }

    changeMetaThemeColorWhenAvailable(filter);
}

function watchForUpdates() {
    const managedStyles = Array.from(styleManagers.keys());
    watchForStyleChanges(managedStyles, ({created, updated, removed, moved}) => {
        const stylesToRemove = removed;
        const stylesToManage = created.concat(updated).concat(moved)
            .filter((style) => !styleManagers.has(style));
        const stylesToRestore = moved
            .filter((style) => styleManagers.has(style));
        stylesToRemove.forEach((style) => removeManager(style));
        const newManagers = stylesToManage
            .map((style) => createManager(style));
        const newVariables = newManagers
            .map((manager) => manager.details())
            .filter((details) => details && details.variables.size > 0)
            .map(({variables}) => variables);
        if (newVariables.length === 0) {
            newManagers.forEach((manager) => manager.render(filter, variables));
        } else {
            newVariables.forEach((variables) => updateVariables(variables));
            throttledRenderAllStyles();
        }
        newManagers.forEach((manager) => manager.watch());
        stylesToRestore.forEach((style) => styleManagers.get(style).restore());
    });

    watchForInlineStyles((element) => {
        overrideInlineStyle(element, filter, fixes.ignoreInlineStyle);
        if (element === document.documentElement) {
            const rootVariables = getElementCSSVariables(document.documentElement);
            if (rootVariables.size > 0) {
                updateVariables(rootVariables);
                throttledRenderAllStyles();
            }
        }
    }, (root) => {
        const inlineStyleElements = root.querySelectorAll(INLINE_STYLE_SELECTOR);
        if (inlineStyleElements.length > 0) {
            createShadowStaticStyleOverrides(root);
            inlineStyleElements.forEach((el) => overrideInlineStyle(el as HTMLElement, filter, fixes.ignoreInlineStyle));
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
}

export function createOrUpdateDynamicTheme(filterConfig: FilterConfig, dynamicThemeFixes: DynamicThemeFix, iframe: boolean) {
    filter = filterConfig;
    fixes = dynamicThemeFixes;
    isIFrame = iframe;
    if (document.head) {
        createThemeAndWatchForUpdates();
    } else {
        if (!isFirefox()) {
            const fallbackStyle = createOrUpdateStyle('darkreader--fallback');
            document.documentElement.appendChild(fallbackStyle);
            fallbackStyle.textContent = getModifiedFallbackStyle(filter, {strict: true});
        }

        const headObserver = new MutationObserver(() => {
            if (document.head) {
                headObserver.disconnect();
                createThemeAndWatchForUpdates();
            }
        });
        headObserver.observe(document, {childList: true, subtree: true});
    }
}

export function removeDynamicTheme() {
    cleanDynamicThemeCache();
    removeNode(document.querySelector('.darkreader--fallback'));
    if (document.head) {
        restoreMetaThemeColor();
        removeNode(document.head.querySelector('.darkreader--user-agent'));
        removeNode(document.head.querySelector('.darkreader--text'));
        removeNode(document.head.querySelector('.darkreader--invert'));
        removeNode(document.head.querySelector('.darkreader--inline'));
        removeNode(document.head.querySelector('.darkreader--override'));
    }
    shadowRootsWithOverrides.forEach((root) => {
        removeNode(root.querySelector('.darkreader--inline'));
    });
    shadowRootsWithOverrides.clear();
    forEach(styleManagers.keys(), (el) => removeManager(el));
    document.querySelectorAll('.darkreader').forEach(removeNode);
}

export function cleanDynamicThemeCache() {
    stopWatchingForDocumentVisibility();
    cancelRendering();
    stopWatchingForUpdates();
    cleanModificationCache();
}
