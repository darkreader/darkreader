declare const __DEBUG__: boolean;

export function logInfo(...args) {
    __DEBUG__ && console.info(...args);
}

export function logWarn(...args) {
    __DEBUG__ && console.warn(...args);
}
