import type {DebugMessageCStoBG} from '../../definitions';
import {DebugMessageTypeCStoBG} from '../../utils/message';

declare const __DEBUG__: boolean;
declare const __TEST__: boolean;
declare const __WATCH__: boolean;
declare const __LOG__: 'info' | 'warn';

function sendLogToBG(level: 'info' | 'warn' | 'assert', ...args: any[]) {
    if (__WATCH__ && __LOG__ && (__LOG__ === 'info' || level === 'warn')) {
        // No need to generate contextId since we do not expect a response
        chrome.runtime.sendMessage<DebugMessageCStoBG>({type: DebugMessageTypeCStoBG.LOG, data: {level, log: args}});
    }
}

export function logInfo(...args: any[]): void {
    if (__DEBUG__) {
        console.info('DARK READER', ...args);
        sendLogToBG('info', ...args);
    }
}

export function logWarn(...args: any[]): void {
    if (__DEBUG__) {
        // console.warn is slow in Chrome
        // console.warn(...args);
        console.log('DARK READER', ...args);
        sendLogToBG('warn', ...args);
    }
}

export function logInfoCollapsed(title: string, ...args: any[]): void {
    if (__DEBUG__) {
        console.groupCollapsed(`DARK READER ${title}`);
        console.log(...args);
        console.groupEnd();
    }
}

function logAssert(...args: any[]): void {
    if ((__TEST__ || __DEBUG__)) {
        console.assert(false, 'DARK READER', ...args);
        sendLogToBG('assert', ...args);
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
