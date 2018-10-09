import {replaceCSSVariables} from './css-rules';
import {overrideInlineStyles, getInlineOverrideStyle, watchForInlineStyles, stopWatchingForInlineStyles} from './inline-style';
import {getModifiedUserAgentStyle, getModifiedFallbackStyle, cleanModificationCache} from './modify-css';
import {manageStyle, shouldManageStyle, STYLE_SELECTOR, StyleManager} from './style-manager';
import {watchForStyleChanges, stopWatchingForStyleChanges} from './watch';
import {removeNode} from '../utils/dom';
import {throttle} from '../utils/throttle';
import {clamp} from '../../utils/math';
import {getCSSFilterValue} from '../../generators/css-filter';
import {createTextStyle} from '../../generators/text-style';
import {FilterConfig, DynamicThemeFix} from '../../definitions';

const styleManagers = new Map<HTMLLinkElement | HTMLStyleElement, StyleManager>();
const variables = new Map<string, string>();
let filter: FilterConfig = null;
let fixes: DynamicThemeFix = null;
let isIFrame: boolean = null;

function createOrUpdateStyle(className: string) {
    let style = document.head.querySelector(`.${className}`) as HTMLStyleElement;
    if (!style) {
        style = document.createElement('style');
        style.classList.add('darkreader');
        style.classList.add(className);
        style.media = 'screen';
    }
    return style;
}

function createTheme() {
    const fallbackStyle = createOrUpdateStyle('darkreader--fallback');
    document.head.insertBefore(fallbackStyle, document.head.firstChild);
    fallbackStyle.textContent = getModifiedFallbackStyle(filter);

    const userAgentStyle = createOrUpdateStyle('darkreader--user-agent');
    document.head.insertBefore(userAgentStyle, fallbackStyle.nextSibling);
    userAgentStyle.textContent = getModifiedUserAgentStyle(filter, isIFrame);

    const textStyle = createOrUpdateStyle('darkreader--text');
    document.head.insertBefore(textStyle, fallbackStyle.nextSibling);
    if (filter.useFont || filter.textStroke > 0) {
        textStyle.textContent = createTextStyle(filter);
    } else {
        textStyle.textContent = '';
    }

    const invertStyle = createOrUpdateStyle('darkreader--invert');
    document.head.insertBefore(invertStyle, textStyle.nextSibling);
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

    const inlineStyle = createOrUpdateStyle('darkreader--inline');
    document.head.insertBefore(inlineStyle, invertStyle.nextSibling);
    inlineStyle.textContent = getInlineOverrideStyle();

    createManagers();
    throttledRender();
    overrideInlineStyles(filter);

    if (loadingStyles.size === 0) {
        fallbackStyle.textContent = '';
    }
}

function createManagers() {
    Array.from<HTMLLinkElement | HTMLStyleElement>(document.querySelectorAll(STYLE_SELECTOR))
        .filter((style) => !styleManagers.has(style) && shouldManageStyle(style))
        .forEach((style) => createManager(style));
}

const pendingCreation = new Set<HTMLLinkElement | HTMLStyleElement>();

let loadingStylesCounter = 0;
let loadingStyles = new Set();

async function createManager(element: HTMLLinkElement | HTMLStyleElement) {
    if (styleManagers.has(element) || pendingCreation.has(element)) {
        return;
    }
    pendingCreation.add(element);

    let manager: StyleManager = null;

    function update() {
        if (!manager) {
            return;
        }
        const details = manager.details();
        updateVariables(details.variables);
        throttledRender();
    }

    let loadingStyleId = ++loadingStylesCounter;

    function loadingStart() {
        if (!isPageLoaded()) {
            loadingStyles.add(loadingStyleId);
        }
    }

    function loadingEnd() {
        loadingStyles.delete(loadingStyleId);
        if (loadingStyles.size === 0 && isPageLoaded()) {
            document.head.querySelector('.darkreader--fallback').textContent = '';
        }
    }

    manager = await manageStyle(element, {update, loadingStart, loadingEnd});
    if (!pendingCreation.has(element)) {
        manager.destroy();
        return;
    }
    styleManagers.set(element, manager);
    update();
}

function updateVariables(newVars: Map<string, string>) {
    newVars.forEach((value, key) => variables.set(key, value));
    variables.forEach((value, key) => variables.set(key, replaceCSSVariables(value, variables)));
}

function removeManager(element: HTMLLinkElement | HTMLStyleElement) {
    const manager = styleManagers.get(element);
    if (manager) {
        manager.destroy();
        styleManagers.delete(element);
    }
}

const throttledRender = throttle(function render() {
    styleManagers.forEach((manager) => manager.render(filter, variables));
});

function isPageLoaded() {
    return document.readyState === 'complete' || document.readyState === 'interactive';
}

function onReadyStateChange() {
    if (!isPageLoaded()) {
        return;
    }
    if (loadingStyles.size === 0) {
        document.head.querySelector('.darkreader--fallback').textContent = '';
    }
    createManagers();
    throttledRender();
}

function createThemeAndWatchForUpdates() {
    createTheme();

    watchForStyleChanges(({created, updated, removed}) => {
        Array.from(new Set(created.concat(updated)))
            .filter((style) => !styleManagers.has(style))
            .forEach((style) => createManager(style));
        removed.forEach((style) => removeManager(style));
        throttledRender();
    });
    watchForInlineStyles(filter);

    document.addEventListener('readystatechange', onReadyStateChange);
    window.addEventListener('load', throttledRender);
}

function stopWatchingForUpdates() {
    styleManagers.forEach((manager) => manager.pause());
    stopWatchingForStyleChanges();
    stopWatchingForInlineStyles();
    document.removeEventListener('readystatechange', onReadyStateChange);
    window.removeEventListener('load', throttledRender);
}

export function createOrUpdateDynamicTheme(filterConfig: FilterConfig, dynamicThemeFixes: DynamicThemeFix, iframe: boolean) {
    filter = filterConfig;
    fixes = dynamicThemeFixes;
    isIFrame = iframe;
    if (document.head) {
        createThemeAndWatchForUpdates();
    } else {
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
    if (document.head) {
        removeNode(document.head.querySelector('.darkreader--user-agent'));
        removeNode(document.head.querySelector('.darkreader--fallback'));
        removeNode(document.head.querySelector('.darkreader--text'));
        removeNode(document.head.querySelector('.darkreader--invert'));
        removeNode(document.head.querySelector('.darkreader--inline'));
    }
    Array.from(styleManagers.keys()).forEach((el) => removeManager(el));
    Array.from(document.querySelectorAll('.darkreader')).forEach(removeNode);
}

export function cleanDynamicThemeCache() {
    throttledRender.cancel();
    pendingCreation.clear();
    stopWatchingForUpdates();
    cleanModificationCache();
}
