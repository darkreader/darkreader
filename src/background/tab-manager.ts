import {canInjectScript} from '../background/utils/extension-api';
import {LimitedCacheStorage} from './utils/network';
import {Message} from '../definitions';

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

        const dataURLCache = new LimitedCacheStorage();
        const textCache = new LimitedCacheStorage();

        chrome.runtime.onMessage.addListener(async ({type, data, id}: Message, sender) => {
            if (type === 'fetch') {
                const {url, responseType} = data;

                // Using custom response due to Chrome and Firefox incompatibility
                // Sometimes fetch error behaves like synchronous and sends `undefined`
                const sendResponse = (response) => chrome.tabs.sendMessage(sender.tab.id, {type: 'fetch-response', id, ...response});

                if (responseType === 'data-url' && dataURLCache.has(url)) {
                    sendResponse({data: dataURLCache.get(url)});
                    return;
                }

                if (responseType === 'text' && textCache.has(url)) {
                    sendResponse({data: textCache.get(url)});
                    return;
                }

                try {
                    const response = await fetch(url, {cache: 'force-cache'});
                    if (response.ok) {
                        if (responseType === 'data-url') {
                            const blob = await response.blob();
                            const dataURL = await (new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.readAsDataURL(blob);
                            }));
                            sendResponse({data: dataURL});
                            dataURLCache.set(url, dataURL);
                        } else {
                            const text = await response.text();
                            sendResponse({data: text});
                            textCache.set(url, text);
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
            .forEach((tab) => !tab.discarded && chrome.tabs.executeScript(tab.id, {
                runAt: 'document_start',
                file: '/inject/index.js',
                allFrames: true,
                matchAboutBlank: true,
            }));
    }

    async sendMessage(getMessage: (url: string, frameUrl: string) => any) {
        (await queryTabs({}))
            .filter((tab) => this.ports.has(tab.id))
            .forEach((tab) => {
                const framesPorts = this.ports.get(tab.id);
                framesPorts.forEach(({url, port}, frameId) => {
                    const message = getMessage(tab.url, frameId === 0 ? null : url);
                    if (tab.active && frameId === 0) {
                        port.postMessage(message);
                    } else {
                        setTimeout(() => port.postMessage(message));
                    }
                });
            });
    }

    async getActiveTabURL() {
        let tab = (await queryTabs({
            active: true,
            lastFocusedWindow: true
        }))[0];
        // When Dark Reader's Dev Tools are open, query can return extension's page instead of expected page
        const isExtensionPage = (url: string) => url.startsWith('chrome-extension:') || url.startsWith('moz-extension:');
        if (isExtensionPage(tab.url)) {
            const tabs = (await queryTabs({active: true}));
            tab = tabs.find((t) => !isExtensionPage(t.url)) || tab;
        }
        return tab.url;
    }
}
