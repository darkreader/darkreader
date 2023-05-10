import {isMatchMediaChangeEventListenerSupported} from './platform';
import {isTopFrame} from '../inject/utils/dom';

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

export const isSystemDarkModeEnabled = (): boolean | undefined => {
    /* prefers-color-scheme may be overridden in embedded frames, so we cannot
     * know whether it truely reflects the system color scheme.
     *
     * to avoid emitting an incorrect value, we will return undefined if we are
     * not in a top level frame.
     */
    if (isTopFrame()) {
        return (query || matchMedia('(prefers-color-scheme: dark)')).matches;
    }
    return undefined;
};
