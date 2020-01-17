import {Extension} from './extension';
import {isFirefox} from '../utils/platform';
import {getHelpURL} from '../utils/links';

// Initialize extension
const extension = new Extension();
extension.start();

chrome.runtime.onInstalled.addListener(({reason}) => {
    if (reason === 'install') {
        chrome.tabs.create({url: getHelpURL()});
    }
});

declare const __DEBUG__: boolean;
declare const __PORT__: number;
const DEBUG = __DEBUG__;

if (DEBUG) {
    const PORT = __PORT__;
    const listen = () => {
        const socket = new WebSocket(`ws://localhost:${PORT}`);
        const send = (message: any) => socket.send(JSON.stringify(message));
        socket.onmessage = (e) => {
            const message = JSON.parse(e.data);

            if (message.type === 'reload') {
                send({type: 'reloading'});
                const cssOnly = message.files.every((file) => file.endsWith('.less'));
                if (cssOnly) {
                    chrome.runtime.sendMessage({type: 'popup-stylesheet-update'});
                } else {
                    chrome.runtime.reload();
                }
            }
        };
        socket.onclose = () => setTimeout(listen, 1000);
    };
    listen();
}
