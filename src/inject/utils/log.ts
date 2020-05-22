declare const __WATCH__: boolean;
const WATCH = __WATCH__;

export function logInfo(...args) {
    WATCH && console.info(...args);
}

export function logWarn(...args) {
    WATCH && console.warn(...args);
}
