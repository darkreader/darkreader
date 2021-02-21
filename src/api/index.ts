import './chrome';
import {setFetchMethod as setFetch} from './fetch';
import {DEFAULT_THEME} from '../defaults';
import type {Theme, DynamicThemeFix} from '../definitions';
import ThemeEngines from '../generators/theme-engines';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../inject/dynamic-theme';
import {collectCSS} from '../inject/dynamic-theme/css-collection';
import {isMatchMediaChangeEventListenerSupported} from '../utils/platform';
import {ensureIFrameIsLoaded, getAllIFrames, isIFrame, setupIFrameData, setupIFrameObserver} from './iframes';

let isDarkReaderEnabled = false;
let usesIFrames = false;

export function enable(themeOptions: Partial<Theme> = {}, fixes: DynamicThemeFix = null) {
    const theme = {...DEFAULT_THEME, ...themeOptions};

    if (theme.engine !== ThemeEngines.dynamicTheme) {
        throw new Error('Theme engine is not supported.');
    }
    store = {theme, fixes};
    createOrUpdateDynamicTheme(theme, fixes, isIFrame);
    isDarkReaderEnabled = true;

    const enableDynamicThemeEvent = new CustomEvent('__darkreader__enableDynamicTheme', {detail: {theme, fixes}});
    usesIFrames && getAllIFrames(document).forEach((IFrame) => ensureIFrameIsLoaded(IFrame, (IFrameDocument) => IFrameDocument.dispatchEvent(enableDynamicThemeEvent)));
}

export function isEnabled() {
    return isDarkReaderEnabled;
}

export function disable() {
    removeDynamicTheme();
    isDarkReaderEnabled = false;
    const removeDynamicThemeEvent = new CustomEvent('__darkreader__removeDynamicTheme');
    usesIFrames && getAllIFrames(document).forEach((IFrame) => ensureIFrameIsLoaded(IFrame, (IFrameDocument) => IFrameDocument.dispatchEvent(removeDynamicThemeEvent)));
}

const darkScheme = matchMedia('(prefers-color-scheme: dark)');
let store = {
    theme: null as Theme,
    fixes: null as DynamicThemeFix,
};

const getStore = () => store;

function handleColorScheme() {
    if (darkScheme.matches) {
        enable(store.theme, store.fixes);
    } else {
        disable();
    }
}

export function auto(themeOptions: Partial<Theme> | false = {}, fixes: DynamicThemeFix = null) {
    if (themeOptions) {
        const theme = {...DEFAULT_THEME, ...themeOptions};
        store = {theme, fixes};
        handleColorScheme();
        if (isMatchMediaChangeEventListenerSupported) {
            darkScheme.addEventListener('change', handleColorScheme);
        } else {
            darkScheme.addListener(handleColorScheme);
        }
    } else {
        if (isMatchMediaChangeEventListenerSupported) {
            darkScheme.removeEventListener('change', handleColorScheme);
        } else {
            darkScheme.removeListener(handleColorScheme);
        }
        disable();
    }
}

export async function exportGeneratedCSS(): Promise<string> {
    return await collectCSS();
}

export function setupIFrameListener(listener: (IFrameDocument: Document) => void) {
    if (!listener || listener.length !== 1) {
        throw new Error('Must provide an listener with 1 argument, the literatal template should follow "(IFrameDocument: Document) => void".');
    }
    usesIFrames = true;
    setupIFrameObserver();
    setupIFrameData(listener, getStore, () => isDarkReaderEnabled);
}

export const setFetchMethod = setFetch;
