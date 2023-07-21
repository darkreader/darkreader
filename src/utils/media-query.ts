import {isMatchMediaChangeEventListenerSupported} from './platform';

declare const __TEST__: boolean;
let override: boolean | null = null;

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

export function emulateColorScheme(colorScheme: 'light' | 'dark'): void {
    if (__TEST__) {
        const isDark = colorScheme === 'dark';
        override = isDark;
        listeners.forEach((l) => l(isDark));
    }
}

export const isSystemDarkModeEnabled = (): boolean => (__TEST__ && typeof override === 'boolean') ? override : (query || matchMedia('(prefers-color-scheme: dark)')).matches;
