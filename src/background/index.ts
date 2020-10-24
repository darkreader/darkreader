import {Extension} from './extension';
import {getHelpURL, UNINSTALL_URL} from '../utils/links';

// Initialize extension
const extension = new Extension();
extension.start();

const prefId = 'styleViaXhr';
const blobUrlPrefix = 'blob:' + chrome.runtime.getURL('/');
const stylesToPass = {};
const reqFilter = {
    urls: ['<all_urls>'],
    types: ['main_frame', 'sub_frame'] as any[],
};
chrome.webRequest.onBeforeRequest.addListener(prepareStyles, reqFilter);
chrome.webRequest.onHeadersReceived.addListener(passStyles, reqFilter, [
    'blocking',
    'responseHeaders',
    'extraHeaders',
].filter(Boolean));
chrome.declarativeContent.onPageChanged.removeRules([prefId], async () => {
    chrome.declarativeContent.onPageChanged.addRules([{
        id: prefId,
        conditions: [
            new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {urlContains: ':'},
            }),
        ],
        actions: [
            new (chrome.declarativeContent as any).RequestContentScript({
                allFrames: true,
                // This runs earlier than document_start
                js: chrome.runtime.getManifest().content_scripts[0].js,
            }),
        ],
    }]);
});
function prepareStyles(req: chrome.webRequest.WebRequestBodyDetails) {
    const str = JSON.stringify({type: 'hello', data:'data'});
    stylesToPass[req.requestId] = URL.createObjectURL(new Blob([str])).slice(blobUrlPrefix.length);
    setTimeout(cleanUp, 600e3, req.requestId);
}

function passStyles(req: chrome.webRequest.WebResponseHeadersDetails) {
    const blobId = stylesToPass[req.requestId];
    if (blobId) {
        const {responseHeaders} = req;
        responseHeaders.push({
            name: 'Set-Cookie',
            value: `${chrome.runtime.id}=${blobId}`,
        });
        return {responseHeaders};
    }
}

function cleanUp(key: string) {
    const blobId = stylesToPass[key];
    delete stylesToPass[key];
    if (blobId) {
        URL.revokeObjectURL(blobUrlPrefix + blobId);
    }
}

chrome.runtime.onInstalled.addListener(({reason}) => {
    if (reason === 'install') {
        chrome.tabs.create({url: getHelpURL()});
    }
});

chrome.runtime.setUninstallURL(UNINSTALL_URL);

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
                    chrome.runtime.reload();
                    break;
                }
            }
        };
        socket.onclose = () => setTimeout(listen, 1000);
    };
    listen();
}
