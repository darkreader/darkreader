// @ts-check
import './chrome';
import {setFetchMethod as setFetch} from './fetch';
import {DEFAULT_THEME} from '../defaults';
import ThemeEngines from '../generators/theme-engines';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../inject/dynamic-theme';
import {collectCSS} from '../inject/dynamic-theme/css-collection';
import {isMatchMediaChangeEventListenerSupported} from '../utils/platform';

/** @typedef {import('../definitions').DynamicThemeFix} DynamicThemeFix */
/** @typedef {import('../definitions').Theme} Theme */

let isDarkReaderEnabled = false;
const isIFrame = (() => {
    try {
        return window.self !== window.top;
    } catch (err) {
        console.warn(err);
        return true;
    }
})();

/**
 * @param {Partial<Theme>} themeOptions
 * @param {DynamicThemeFix} fixes
 */
export function enable(themeOptions = {}, fixes = null) {
    const theme = {...DEFAULT_THEME, ...themeOptions};

    if (theme.engine !== ThemeEngines.dynamicTheme) {
        throw new Error('Theme engine is not supported.');
    }
    createOrUpdateDynamicTheme(theme, fixes, isIFrame);
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
    themeOptions: /** @type {Partial<Theme>} */(null),
    fixes: /** @type {DynamicThemeFix} */(null),
};

function handleColorScheme() {
    if (darkScheme.matches) {
        enable(store.themeOptions, store.fixes);
    } else {
        disable();
    }
}

/**
 * @param {Partial<Theme> | false} themeOptions
 * @param {DynamicThemeFix} fixes
 */
export function auto(themeOptions = {}, fixes = null) {
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

export async function exportGeneratedCSS() {
    return await collectCSS();
}

export const setFetchMethod = setFetch;
