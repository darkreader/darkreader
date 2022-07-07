import {isMatchMediaChangeEventListenerSupported} from '../../utils/platform';

let query: MediaQueryList = null;
let onChange: () => void = null;

export function runColorSchemeChangeDetector(callback: (isDark: boolean) => void) {
    query = matchMedia('(prefers-color-scheme: dark)');
    onChange = () => callback(query.matches);
    if (isMatchMediaChangeEventListenerSupported) {
        query.addEventListener('change', onChange);
    } else {
        query.addListener(onChange);
    }
}

export function stopColorSchemeChangeDetector() {
    if (!query || !onChange) {
        return;
    }
    if (isMatchMediaChangeEventListenerSupported) {
        query.removeEventListener('change', onChange);
    } else {
        query.removeListener(onChange);
    }
    query = null;
    onChange = null;
}

export const isSystemDarkScheme = () => (query || matchMedia('(prefers-color-scheme: dark)')).matches;
