import './chrome';
import {setFetchMethod as setFetch} from './fetch';
import {DEFAULT_THEME} from '../defaults';
import {Theme, DynamicThemeFix} from '../definitions';
import ThemeEngines from '../generators/theme-engines';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../inject/dynamic-theme';


export const setFetchMethod = setFetch;

const darkScheme = matchMedia('(prefers-color-scheme: dark)');
let store = {
    themeOptions: null as Partial<Theme>,
    fixes: {} as DynamicThemeFix,
};

const isIFrame = (() => {
    try {
        return window.self !== window.top;
    } catch (err) {
        console.warn(err);
        return true;
    }
})();

export function enable(themeOptions: Partial<Theme> = {}, fixes: DynamicThemeFix = {} as DynamicThemeFix) {
    const theme = {...DEFAULT_THEME, ...themeOptions};

    if (theme.engine !== ThemeEngines.dynamicTheme) {
        throw new Error('Theme engine is not supported');
    }


    createOrUpdateDynamicTheme(theme, fixes, isIFrame);
    const frames = document.getElementsByTagName("iframe");
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/darkreader@latest/darkreader.min.js'
    const scriptEnable = document.createElement('script');
    scriptEnable.textContent = `DarkReader.enable()`;
    for (let i = 0, len = frames.length; i < len; ++i)
    {
        const frame = frames[i].contentDocument;
        const a = frame.head.insertBefore(script, frame.head.firstChild);
        frame.head.insertBefore(scriptEnable, a.nextSibling);
    }
}

export function disable() {
    removeDynamicTheme();
}
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
