import {sendLog} from './sendLog';

declare const __DEBUG__: boolean;
const DEBUG = __DEBUG__;

export function logInfo(...args: any[]) {
    if (DEBUG) {
        console.info(...args);
        sendLog('info', args);
    }
}

export function logWarn(...args: any[]) {
    if (DEBUG) {
        console.warn(...args);
        sendLog('warn', args);
    }
}

export function logInfoCollapsed(title: any, ...args: any[]) {
    if (DEBUG) {
        console.groupCollapsed(title);
        console.log(...args);
        console.groupEnd();
        sendLog('info', args);
    }
}
