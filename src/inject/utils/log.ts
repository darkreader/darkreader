import {MessageType} from '../../utils/message';
import type {Message} from '../../definitions';

declare const __DEBUG__: boolean;
declare const __WATCH__: boolean;
declare const __LOG__: 'info' | 'warn';

function sendLogToBG(level: 'info' | 'warn', ...args: any[]) {
    if (__WATCH__ && __LOG__ && (__LOG__ === 'info' || level === 'warn')) {
        chrome.runtime.sendMessage<Message>({type: MessageType.CS_LOG, data: {level, log: args}});
    }
}

export function logInfo(...args: any[]) {
    if (__DEBUG__) {
        console.info(...args);
        sendLogToBG('info', ...args);
    }
}

export function logWarn(...args: any[]) {
    if (__DEBUG__) {
        console.warn(...args);
        sendLogToBG('warn', ...args);
    }
}

export function logInfoCollapsed(title: any, ...args: any[]) {
    if (__DEBUG__) {
        console.groupCollapsed(title);
        console.log(...args);
        console.groupEnd();
    }
}
