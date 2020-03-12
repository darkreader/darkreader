import './chrome';
import {setFetchMethod as setFetch} from './fetch';
import {FilterConfig as Theme, DynamicThemeFix} from '../definitions';
import ThemeEngines from '../generators/theme-engines';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../inject/dynamic-theme';

const defaultTheme: Theme = {
    mode: 1,
    brightness: 100,
    contrast: 100,
    grayscale: 0,
    sepia: 0,
    useFont: false,
    fontFamily: '',
    textStroke: 0,
    engine: ThemeEngines.dynamicTheme,
    stylesheet: '',
};

const isIFrame = (() => {
    try {
        return window.self !== window.top;
    } catch (err) {
        console.warn(err);
        return true;
    }
})();

export function enable(themeOptions: Partial<Theme> = {}, fixes: DynamicThemeFix = null) {
    const theme = {...defaultTheme, ...themeOptions};

    if (theme.engine !== ThemeEngines.dynamicTheme) {
        throw new Error('Theme engine is not supported');
    }

    createOrUpdateDynamicTheme(theme, fixes, isIFrame);
}

export function disable() {
    removeDynamicTheme();
}

const darkScheme = matchMedia('(prefers-color-scheme: dark)');
let store = {
    themeOptions: null as Partial<Theme>,
    fixes: null as DynamicThemeFix,
};

function handleColorScheme() {
    if (darkScheme.matches) {
        enable(store.themeOptions, store.fixes);
    } else {
        disable();
    }
}

export function auto(themeOptions: Partial<Theme> | false = {}, fixes: DynamicThemeFix = null) {
    if (themeOptions) {
        store = {themeOptions, fixes};
        handleColorScheme();
        darkScheme.addListener(handleColorScheme);
    } else {
        darkScheme.removeListener(handleColorScheme);
        disable();
    }
}

export const setFetchMethod = setFetch;
