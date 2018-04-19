declare const __DEBUG__: boolean;
const DEBUG = __DEBUG__;

export function logInfo(...args) {
    DEBUG && console.info(...args);
}

export function logWarn(...args) {
    DEBUG && console.warn(...args);
}
