import './chrome';
import {setFetchMethod as setFetch} from './fetch';
import {FilterConfig as Theme, DynamicThemeFix as DynamicFix, UserSettings} from '../definitions';
import ThemeEngines from '../generators/theme-engines';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../inject/dynamic-theme';
import {isMacOS, isWindows} from '../utils/platform';

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
const defaultSettings: UserSettings = {
    enabled: true,
    theme: {
        mode: 1,
        brightness: 100,
        contrast: 100,
        grayscale: 0,
        sepia: 0,
        useFont: false,
        fontFamily: isMacOS() ? 'Helvetica Neue' : isWindows() ? 'Segoe UI' : 'Open Sans',
        textStroke: 0,
        engine: ThemeEngines.dynamicTheme,
        stylesheet: '',
    },
    customThemes: [],
    siteList: [],
    siteListEnabled: [],
    applyToListedOnly: false,
    changeBrowserTheme: false,
    notifyOfNews: false,
    syncSettings: true,
    automation: '',
    time: {
        activation: '18:00',
        deactivation: '9:00',
    },
    location: {
        latitude: null,
        longitude: null,
    },
    previewNewDesign: false,
    enableForPDF: true,
    scrollbarTheming: true,
};

const darkScheme = matchMedia('(prefers-color-scheme: dark)');
const isIFrame = (() => {
    try {
        return window.self !== window.top;
    } catch (err) {
        console.warn(err);
        return true;
    }
})();

export function enable(themeOptions: Partial<Theme> = {}, userSettings: UserSettings = defaultSettings, fixes: DynamicFix = null) {
    const theme = {...defaultTheme, ...themeOptions};
    if (document.querySelector('.darkreader')) {
        return;
    }

    if (theme.engine !== ThemeEngines.dynamicTheme) {
        throw new Error('Theme engine is not supported');
    }

    createOrUpdateDynamicTheme(theme, fixes, userSettings, isIFrame);
}

export function disable() {
    removeDynamicTheme();
}

function handleColorScheme() {
    if (darkScheme.matches) {
        enable();
    } else {
        disable();
    }
}

export function auto(themeOptions: Partial<Theme> | false = {}) {
    if (themeOptions) {
        handleColorScheme();
        darkScheme.addListener(handleColorScheme);
    } else {
        darkScheme.removeListener(handleColorScheme);
        disable();
    }
}

export const setFetchMethod = setFetch;
