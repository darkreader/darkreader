import {isMatchMediaChangeEventListenerSupported} from './platform';

let query: MediaQueryList | null = null;
const onChange: ({matches}: {matches: boolean}) => void = ({matches}) => listeners.forEach((listener) => listener(matches));
const listeners = new Set<(isDark: boolean) => void>();

export function runColorSchemeChangeDetector(callback: (isDark: boolean) => void): void {
    listeners.add(callback);
    if (query) {
        return;
    }
    query = matchMedia('(prefers-color-scheme: dark)');
    if (isMatchMediaChangeEventListenerSupported) {
        // MediaQueryList change event is not cancellable and does not bubble
        query.addEventListener('change', onChange);
    } else {
        query.addListener(onChange);
    }
}

export function stopColorSchemeChangeDetector(): void {
    if (!query || !onChange) {
        return;
    }
    if (isMatchMediaChangeEventListenerSupported) {
        query.removeEventListener('change', onChange);
    } else {
        query.removeListener(onChange);
    }
    listeners.clear();
    query = null;
}

export const isSystemDarkModeEnabled = (): boolean => (query || matchMedia('(prefers-color-scheme: dark)')).matches;
