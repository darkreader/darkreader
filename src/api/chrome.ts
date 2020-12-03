import {readResponseAsDataURL} from '../utils/network';
import {callFetchMethod} from './fetch';

if (!window.chrome) {
    window.chrome = {} as any;
}
if (!chrome.runtime) {
    chrome.runtime = {} as any;
}

const messageListeners = new Set<(...args) => void>();

async function sendMessage(...args) {
    if (args[0] && args[0].type === 'fetch') {
        const {id} = args[0];
        try {
            const {url, responseType} = args[0].data;
            const response = await callFetchMethod(url);
            let text: string;
            if (responseType === 'data-url') {
                text = await readResponseAsDataURL(response);
            } else {
                text = await response.text();
            }
            messageListeners.forEach((cb) => cb({type: 'fetch-response', data: text, error: null, id}));
        } catch (err) {
            console.error(err);
            messageListeners.forEach((cb) => cb({type: 'fetch-response', data: null, err, id}));
        }
    }
}

function addMessageListener(callback) {
    messageListeners.add(callback);
}

if (typeof chrome.runtime.sendMessage === 'function') {
    const nativeSendMessage = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = (...args) => {
        sendMessage(...args);
        nativeSendMessage.apply(chrome.runtime, args);
    };
} else {
    chrome.runtime.sendMessage = sendMessage;
}

if (!chrome.runtime.onMessage) {
    chrome.runtime.onMessage = {} as any;
}
if (typeof chrome.runtime.onMessage.addListener === 'function') {
    const nativeAddListener = chrome.runtime.onMessage.addListener;
    chrome.runtime.onMessage.addListener = (...args) => {
        addMessageListener(...args);
        nativeAddListener.apply(chrome.runtime.onMessage, args);
    };
} else {
    chrome.runtime.onMessage.addListener = addMessageListener;
}
