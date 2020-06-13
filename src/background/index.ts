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

declare const __WATCH__: boolean;
declare const __PORT__: number;
const WATCH = __WATCH__;

if (WATCH) {
    const PORT = __PORT__;
    const listen = () => {
        const socket = new WebSocket(`ws://localhost:${PORT}`);
        const send = (message: any) => socket.send(JSON.stringify(message));
        socket.onmessage = (e) => {
            const message = JSON.parse(e.data);
            if (message.type.startsWith('reload:')) {
                send({type: 'reloading'});
            }
            switch (message.type) {
                case 'reload:css': {
                    chrome.runtime.sendMessage({type: 'css-update'});
                    break;
                }
                case 'reload:ui': {
                    chrome.runtime.sendMessage({type: 'ui-update'});
                    break;
                }
                case 'reload:full': {
                    chrome.runtime.reload();
                    break;
                }
            }
        };
        socket.onclose = () => setTimeout(listen, 1000);
    };
    listen();
}
