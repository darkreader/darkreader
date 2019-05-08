import {Extension} from './extension';
import {getHelpURL} from '../utils/links';

// Initialize extension
const extension = new Extension();
extension.start();

chrome.runtime.onInstalled.addListener(({reason}) => {
    if (reason === 'install') {
        // chrome.tabs.create({url: getHelpURL()});
    }
});

declare const __DEBUG__: boolean;
const DEBUG = __DEBUG__;

if (DEBUG) {
    // Reload extension on connection
    const listen = () => {
        const req = new XMLHttpRequest();
        req.open('GET', 'http://localhost:8890/', true);
        req.overrideMimeType('text/plain');
        req.onload = () => {
            if (req.status >= 200 && req.status < 300 && req.responseText === 'reload') {
                chrome.runtime.reload();
            } else {
                setTimeout(listen, 2000);
            }
        };
        req.onerror = () => setTimeout(listen, 2000);
        req.send();
    };
    setTimeout(listen, 2000);
}
