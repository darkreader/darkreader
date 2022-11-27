import './chrome';
import {setFetchMethod as setFetch} from './fetch';
import {DEFAULT_THEME} from '../defaults';
import type {Theme, DynamicThemeFix} from '../definitions';
import {ThemeEngine} from '../generators/theme-engines';
import {createOrUpdateDynamicThemeInternal, removeDynamicTheme} from '../inject/dynamic-theme';
import {collectCSS} from '../inject/dynamic-theme/css-collection';
import {isMatchMediaChangeEventListenerSupported} from '../utils/platform';

let isDarkReaderEnabled = false;
const isIFrame = (() => {
    try {
        return window.self !== window.top;
    } catch (err) {
        console.warn(err);
        return true;
    }
})();

export function enable(themeOptions: Partial<Theme> | null = {}, fixes: DynamicThemeFix | null = null) {
    const theme = {...DEFAULT_THEME, ...themeOptions};

    if (theme.engine !== ThemeEngine.dynamicTheme) {
        throw new Error('Theme engine is not supported.');
    }
    // TODO: repalce with createOrUpdateDynamicTheme() and make fixes signature
    // DynamicThemeFix | DynamicThemeFix[]
    createOrUpdateDynamicThemeInternal(theme, fixes, isIFrame);
    isDarkReaderEnabled = true;
}

export function isEnabled() {
    return isDarkReaderEnabled;
}

export function disable() {
    removeDynamicTheme();
    isDarkReaderEnabled = false;
}

const darkScheme = matchMedia('(prefers-color-scheme: dark)');
let store = {
    themeOptions: null as Partial<Theme> | null,
    fixes: null as DynamicThemeFix | null,
};

function handleColorScheme() {
    if (darkScheme.matches) {
        enable(store.themeOptions, store.fixes);
    } else {
        disable();
    }
}

export function auto(themeOptions: Partial<Theme> | false = {}, fixes: DynamicThemeFix | null = null) {
    if (themeOptions) {
        store = {themeOptions, fixes};
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

export const setFetchMethod = setFetch;
