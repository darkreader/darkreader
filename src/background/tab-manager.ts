import {canInjectScript} from '../background/utils/extension-api';
import {createFileLoader} from './utils/network';
import {Message} from '../definitions';

function queryTabs(query: chrome.tabs.QueryInfo) {
    return new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query(query, (tabs) => resolve(tabs));
    });
}

interface TabManagerOptions {
    getConnectionMessage: (url: string, frameUrl: string) => any;
    onColorSchemeChange: ({isDark}) => void;
}

interface PortInfo {
    url: string;
    port: chrome.runtime.Port;
}

export default class TabManager {
    private ports: Map<number, Map<number, PortInfo>>;

    constructor({getConnectionMessage, onColorSchemeChange}: TabManagerOptions) {
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

        const fileLoader = createFileLoader();

        chrome.runtime.onMessage.addListener(async ({type, data, id}: Message, sender) => {
            if (type === 'fetch') {
                const {url, responseType, mimeType} = data;

                // Using custom response due to Chrome and Firefox incompatibility
                // Sometimes fetch error behaves like synchronous and sends `undefined`
                const sendResponse = (response) => chrome.tabs.sendMessage(sender.tab.id, {type: 'fetch-response', id, ...response});
                try {
                    const response = await fileLoader.get({url, responseType, mimeType});
                    sendResponse({data: response});
                } catch (err) {
                    sendResponse({error: err && err.message ? err.message : err});
                }
            }

            if (type === 'color-scheme-change') {
                onColorSchemeChange(data);
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
        if (!tab || isExtensionPage(tab.url)) {
            const tabs = (await queryTabs({active: true}));
            tab = tabs.find((t) => !isExtensionPage(t.url)) || tab;
        }
        return tab.url;
    }
}
