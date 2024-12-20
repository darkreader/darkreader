import type {MessageBGtoCS, MessageCStoBG} from '../../../src/definitions';
import {MessageTypeBGtoCS, MessageTypeCStoBG} from '../../../src/utils/message';

let nativeSendMessage: typeof chrome.runtime.sendMessage;
const bgResponses = new Map<string, string>();

export function stubChromeRuntimeMessage(): void {
    nativeSendMessage = chrome.runtime.sendMessage;
    const listeners: Array<(message: MessageBGtoCS) => void> = (chrome.runtime.onMessage as any)['__listeners__'];

    (chrome.runtime as any).sendMessage = (message: MessageCStoBG) => {
        if (message.type === MessageTypeCStoBG.FETCH) {
            const {id, data: {url}} = message;
            setTimeout(() => {
                listeners.forEach((listener) => {
                    if (!bgResponses.has(url)) {
                        throw new Error('Response is missing, use `stubBackgroundFetchResponse()`');
                    }
                    const data = bgResponses.get(url);
                    listener({type: MessageTypeBGtoCS.FETCH_RESPONSE, data, error: null, id});
                });
            });
        }
    };
}

export function resetChromeRuntimeMessageStub(): void {
    chrome.runtime.sendMessage = nativeSendMessage;
    bgResponses.clear();
}

export function stubBackgroundFetchResponse(url: string, content: string): void {
    bgResponses.set(url, content);
}

const urlResponses = new Map<string, string>();
export function stubChromeRuntimeGetURL(path: string, url: string): void {
    urlResponses.set(path, url);
    (chrome.runtime as any).getURL = (path: string) => {
        return urlResponses.get(path);
    };
}
