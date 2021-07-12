import {Extension} from './extension';
import {getHelpURL, UNINSTALL_URL} from '../utils/links';
import {canInjectScript} from '../background/utils/extension-api';

// Initialize extension
const extension = new Extension();
extension.start();

const welcome = `  /''''\\
 (0)==(0)
/__||||__\\
Welcome to Dark Reader!`;
console.log(welcome);

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
                    chrome.tabs.query({}, (tabs) => {
                        for (const tab of tabs) {
                            if (canInjectScript(tab.url)) {
                                chrome.tabs.sendMessage(tab.id, {type: 'reload'});
                            }
                        }
                        chrome.runtime.reload();
                    });
                    break;
                }
            }
        };
        socket.onclose = () => setTimeout(listen, 1000);
    };
    listen();
} else {
    chrome.runtime.onInstalled.addListener(({reason}) => {
        if (reason === 'install') {
            chrome.tabs.create({url: getHelpURL()});
        }
    });

    chrome.runtime.setUninstallURL(UNINSTALL_URL);
}
