// @ts-check
import {MessageType} from '../utils/message';
import {readResponseAsDataURL} from '../utils/network';
import {callFetchMethod} from './fetch';

/** @typedef {import('../definitions').Message} Message */

if (!window.chrome) {
    window.chrome = /** @type {any} */({});
}
if (!chrome.runtime) {
    chrome.runtime = /** @type {any} */({});
}

/** @type {Set<(message: Message) => void>} */
const messageListeners = new Set();

/**
 * @param  {...any} args
 */
async function sendMessage(...args) {
    if (args[0] && args[0].type === MessageType.CS_FETCH) {
        const {id} = args[0];
        try {
            const {url, responseType} = args[0].data;
            const response = await callFetchMethod(url);
            /** @type {string} */
            let text;
            if (responseType === 'data-url') {
                text = await readResponseAsDataURL(response);
            } else {
                text = await response.text();
            }
            messageListeners.forEach((cb) => cb({type: MessageType.BG_FETCH_RESPONSE, data: text, error: null, id}));
        } catch (error) {
            console.error(error);
            messageListeners.forEach((cb) => cb({type: MessageType.BG_FETCH_RESPONSE, data: null, error, id}));
        }
    }
}

/**
 * @param {(data: any) => void} callback 
 */
function addMessageListener(callback) {
    messageListeners.add(callback);
}

if (typeof chrome.runtime.sendMessage === 'function') {
    const nativeSendMessage = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = (/** @type {any[]} */...args) => {
        sendMessage(...args);
        nativeSendMessage.apply(chrome.runtime, args);
    };
} else {
    chrome.runtime.sendMessage = sendMessage;
}

if (!chrome.runtime.onMessage) {
    chrome.runtime.onMessage = /** @type {any} */({});
}
if (typeof chrome.runtime.onMessage.addListener === 'function') {
    const nativeAddListener = chrome.runtime.onMessage.addListener;
    chrome.runtime.onMessage.addListener = (/** @type {any[]} */...args) => {
        addMessageListener(args[0]);
        nativeAddListener.apply(chrome.runtime.onMessage, args);
    };
} else {
    chrome.runtime.onMessage.addListener = (/** @type {any[]} */...args) => addMessageListener(args[0]);
}
