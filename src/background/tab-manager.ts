import {canInjectScript} from '../background/utils/extension-api';
import {createFileLoader} from './utils/network';
import {Message} from '../definitions';

function queryTabs(query: chrome.tabs.QueryInfo) {
    return new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query(query, (tabs) => resolve(tabs));
    });
}

interface ConnectionMessageOptions {
    url: string;
    frameURL: string;
    unsupportedSender?: boolean;
}

interface TabManagerOptions {
    getConnectionMessage: (options: ConnectionMessageOptions) => any;
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
                const reply = (options: ConnectionMessageOptions) => {
                    const message = getConnectionMessage(options);
                    if (message instanceof Promise) {
                        message.then((asyncMessage) => asyncMessage && port.postMessage(asyncMessage));
                    } else if (message) {
                        port.postMessage(message);
                    }
                };

                const isPanel = port.sender.tab == null;
                if (isPanel) {
                    // NOTE: Vivaldi and Opera can show a page in a side panel,
                    // but it is not possible to handle messaging correctly (no tab ID, frame ID).
                    reply({url: port.sender.url, frameURL: null, unsupportedSender: true});
                    return;
                }

                const tabId = port.sender.tab.id;
                const {frameId} = port.sender;
                const senderURL = port.sender.url;
                const tabURL = port.sender.tab.url;

                let framesPorts: Map<number, PortInfo>;
                if (this.ports.has(tabId)) {
                    framesPorts = this.ports.get(tabId);
                } else {
                    framesPorts = new Map();
                    this.ports.set(tabId, framesPorts);
                }
                framesPorts.set(frameId, {url: senderURL, port});
                port.onDisconnect.addListener(() => {
                    framesPorts.delete(frameId);
                    if (framesPorts.size === 0) {
                        this.ports.delete(tabId);
                    }
                });

                reply({
                    url: tabURL,
                    frameURL: frameId === 0 ? null : senderURL,
                });
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
            if (type === 'save-file') {
                const {content, name} = data;
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([content]));
                a.download = name;
                a.click();
            }
            if (type === 'request-export-css') {
                const activeTab = await this.getActiveTab();
                this.ports
                    .get(activeTab.id)
                    .get(0).port
                    .postMessage({type: 'export-css'});
            }
        });
    }

    async updateContentScript(options: {runOnProtectedPages: boolean}) {
        (await queryTabs({}))
            .filter((tab) => options.runOnProtectedPages || canInjectScript(tab.url))
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
        return (await this.getActiveTab()).url;
    }
    async getActiveTab() {
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
        return tab;
    }
}
