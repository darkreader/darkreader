declare const __DEBUG__: boolean;
const DEBUG = __DEBUG__;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logInfo(...args: any[]) {
    DEBUG && console.info(...args);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logWarn(...args: any[]) {
    DEBUG && console.warn(...args);
}
