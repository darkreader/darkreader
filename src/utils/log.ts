declare const __DEBUG__: boolean;

/* @__PURE__ */ export function logInfo(...args) {
    __DEBUG__ && console.info(...args);
}

/* @__PURE__ */ export function logWarn(...args) {
    __DEBUG__ && console.warn(...args);
}
