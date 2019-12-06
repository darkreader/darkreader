import {Extension} from './extension';
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
        socket.onmessage = (e) => {
            const message = e.data;
            if (message === 'reload') {
                chrome.runtime.reload();
            }
        };
        socket.onclose = () => setTimeout(listen, 1000);
    };
    listen();
}
