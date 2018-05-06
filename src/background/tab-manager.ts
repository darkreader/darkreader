import {isURLInList} from '../utils/url';
import {canInjectScript} from '../background/utils/extension-api';
import ConfigManager from './config-manager';
import {TabInfo, Message} from '../definitions';

function queryTabs(query: chrome.tabs.QueryInfo) {
    return new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query(query, (tabs) => resolve(tabs));
    });
}

interface TabManagerOptions {
    getConnectionMessage: (url: string, frameUrl: string) => any;
}

interface PortInfo {
    url: string;
    port: chrome.runtime.Port;
}

export default class TabManager {
    private ports: Map<number, Map<number, PortInfo>>;

    constructor({getConnectionMessage}: TabManagerOptions) {
        this.ports = new Map();
        chrome.runtime.onConnect.addListener((port) => {
            if (port.name === 'tab') {
                const tabId = port.sender.tab.id;
                const frameId = port.sender.frameId;
                const url = port.sender.url;
                let framesPorts: Map<number, PortInfo>;
                if (this.ports.has(tabId)) {
                    framesPorts = this.ports.get(tabId);
                } else {
                    framesPorts = new Map();
                    this.ports.set(tabId, framesPorts);
                }
                framesPorts.set(frameId, {url, port});
                port.onDisconnect.addListener(() => {
                    framesPorts.delete(frameId);
                    if (framesPorts.size === 0) {
                        this.ports.delete(tabId);
                    }
                });

                const message = getConnectionMessage(port.sender.tab.url, frameId === 0 ? null : url);
                if (message instanceof Promise) {
                    message.then((asyncMessage) => asyncMessage && port.postMessage(asyncMessage));
                } else if (message) {
                    port.postMessage(message);
                }
            }
        });

        chrome.runtime.onMessage.addListener(async ({type, data, id}: Message, sender) => {
            if (type === 'fetch') {
                const {url, responseType} = data;

                // Using custom response due to Chrome and Firefox incompatibility
                // Sometimes fetch error behaves like synchronous and sends `undefined`
                const sendResponse = (response) => chrome.tabs.sendMessage(sender.tab.id, {type: 'fetch-response', id, ...response});

                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        if (responseType === 'data-url') {
                            const blob = await response.blob();
                            const dataURL = await (new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result);
                                reader.readAsDataURL(blob);
                            }));
                            sendResponse({data: dataURL});
                        } else {
                            const text = await response.text();
                            sendResponse({data: text});
                        }
                    } else {
                        throw new Error(`Unable to load ${url} ${response.status} ${response.statusText}`);
                    }
                } catch (err) {
                    sendResponse({error: err && err.message ? err.message : err});
                }
            }
        });
    }

    async updateContentScript() {
        (await queryTabs({}))
            .filter((tab) => canInjectScript(tab.url))
            .filter((tab) => !this.ports.has(tab.id))
            .forEach((tab) => chrome.tabs.executeScript(tab.id, {
                runAt: 'document_start',
                file: '/inject/index.js',
                allFrames: true,
            }));
    }

    async sendMessage(getMessage: (url: string, frameUrl: string) => any) {
        (await queryTabs({}))
            .filter((tab) => this.ports.has(tab.id))
            .forEach((tab) => {
                const framesPorts = this.ports.get(tab.id);
                framesPorts.forEach(({url, port}, frameId) => {
                    const message = getMessage(tab.url, frameId === 0 ? null : url);
                    if (tab.active) {
                        port.postMessage(message);
                    } else {
                        setTimeout(() => port.postMessage(message));
                    }
                });
            });
    }

    async getActiveTabInfo(config: ConfigManager) {
        const tab = (await queryTabs({
            active: true,
            lastFocusedWindow: true
        }))[0];
        const {DARK_SITES} = config;
        const url = tab.url;
        return <TabInfo>{
            url,
            isProtected: !canInjectScript(url),
            isInDarkList: isURLInList(url, DARK_SITES),
        };
    }
}
