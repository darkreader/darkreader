import {readResponseAsDataURL} from '../utils/network';
import {callFetchMethod} from './fetch';
import {chromeAPI} from './mock';

if (!chromeAPI.runtime) {
    chromeAPI.runtime = {} as any;
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

if (typeof chromeAPI.runtime.sendMessage === 'function') {
    const nativeSendMessage = chromeAPI.runtime.sendMessage;
    chromeAPI.runtime.sendMessage = (...args) => {
        sendMessage(...args);
        nativeSendMessage.apply(chromeAPI.runtime, args);
    };
} else {
    chromeAPI.runtime.sendMessage = sendMessage;
}

if (!chromeAPI.runtime.onMessage) {
    chromeAPI.runtime.onMessage = {} as any;
}
if (typeof chromeAPI.runtime.onMessage.addListener === 'function') {
    const nativeAddListener = chromeAPI.runtime.onMessage.addListener;
    chromeAPI.runtime.onMessage.addListener = (...args: [callback: (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => void]) => {
        addMessageListener(...args);
        nativeAddListener.apply(chromeAPI.runtime.onMessage, args);
    };
} else {
    chromeAPI.runtime.onMessage.addListener = addMessageListener;
}
