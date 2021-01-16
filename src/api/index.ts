import './chrome';
import {setFetchMethod as setFetch} from './fetch';
import {DEFAULT_THEME} from '../defaults';
import type {Theme, DynamicThemeFix} from '../definitions';
import ThemeEngines from '../generators/theme-engines';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../inject/dynamic-theme';
import {collectCSS} from '../inject/dynamic-theme/css-collection';
import {isAPIUseable, isMatchMediaEventDefined, isWindowDefined} from '../utils/platform';

const isIFrame = (() => {
    try {
        return isWindowDefined && window.self !== window.top;
    } catch (err) {
        console.warn(err);
        return true;
    }
})();

export function enable(themeOptions: Partial<Theme> = {}, fixes: DynamicThemeFix = null) {
    if (!isAPIUseable) {
        return;
    }
    const theme = {...DEFAULT_THEME, ...themeOptions};

    if (theme.engine !== ThemeEngines.dynamicTheme) {
        throw new Error('Theme engine is not supported.');
    }
    createOrUpdateDynamicTheme(theme, fixes, isIFrame);
}

export function disable() {
    if (!isAPIUseable) {
        return;
    }
    removeDynamicTheme();
}

const darkScheme = isWindowDefined && matchMedia('(prefers-color-scheme: dark)');
let store = {
    themeOptions: null as Partial<Theme>,
    fixes: null as DynamicThemeFix,
};

function handleColorScheme() {
    if (!isAPIUseable) {
        return;
    }
    if (darkScheme.matches) {
        enable(store.themeOptions, store.fixes);
    } else {
        disable();
    }
}

export function auto(themeOptions: Partial<Theme> | false = {}, fixes: DynamicThemeFix = null) {
    if (!isAPIUseable) {
        return;
    }
    if (themeOptions) {
        store = {themeOptions, fixes};
        handleColorScheme();
        isMatchMediaEventDefined && darkScheme.addEventListener('change', handleColorScheme);
    } else {
        isMatchMediaEventDefined && darkScheme.removeEventListener('change', handleColorScheme);
        disable();
    }
}

export async function exportGeneratedCSS(): Promise<string> {
    if (!isAPIUseable) {
        return;
    }
    return await collectCSS();
}

export const setFetchMethod = setFetch;
