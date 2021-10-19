declare const __DEBUG__: boolean;
const DEBUG = __DEBUG__;

export function logInfo(...args: any[]) {
    DEBUG && console.info(...args);
}

export function logWarn(...args: any[]) {
    DEBUG && console.warn(...args);
}
