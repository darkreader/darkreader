import {sendLog} from './sendLog';

declare const __DEBUG__: boolean;
declare const __TEST__: boolean;

export function logInfo(...args: any[]): void {
    if (__DEBUG__) {
        console.info(...args);
        sendLog('info', args);
    }
}

export function logWarn(...args: any[]): void {
    if (__DEBUG__) {
        console.warn(...args);
        sendLog('warn', args);
    }
}

export function logInfoCollapsed(title: string, ...args: any[]): void {
    if (__DEBUG__) {
        console.groupCollapsed(title);
        console.log(...args);
        console.groupEnd();
        sendLog('info', args);
    }
}

function logAssert(...args: any[]): void {
    if ((__TEST__ || __DEBUG__)) {
        console.assert(...args);
        sendLog('assert', ...args);
    }
}

export function ASSERT(description: string, condition: (() => boolean) | any): void {
    if ((__TEST__ || __DEBUG__) && (typeof condition === 'function' && !condition()) || !condition) {
        logAssert(description);
        if (__TEST__) {
            throw new Error(`Assertion failed: ${description}`);
        }
    }
}
