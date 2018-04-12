
import {isUrlInList} from '../utils/url';
import {canInjectScript} from '../background/utils/extension-api';
import ConfigManager from './config-manager';
import {TabInfo, Message} from '../definitions';

function queryTabs(query: chrome.tabs.QueryInfo) {
    return new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query(query, (tabs) => resolve(tabs));
    });
}

interface TabManagerOptions {
    getConnectionMessage: (url?: string) => any;
}

export default class TabManager {
    private ports: Map<number, chrome.runtime.Port>;

    constructor({getConnectionMessage}: TabManagerOptions) {
        this.ports = new Map();
        chrome.runtime.onConnect.addListener((port) => {
            if (port.name === 'tab') {
                const tabId = port.sender.tab.id;
                this.ports.set(tabId, port);
                port.onDisconnect.addListener(() => this.ports.delete(tabId));

                const message = getConnectionMessage(port.sender.tab.url);
                if (message) {
                    port.postMessage(message);
                }
            }
        });

        chrome.runtime.onMessage.addListener(({type, data}, sender, sendResponse) => {
            if (type === 'fetch') {
                const {url, responseType} = data;
                fetch(url)
                    .then(async (response) => {
                        if (response.status >= 200 && response.status < 300) {
                            const responseData = responseType === 'blob' ? await response.blob() : await response.text();
                            sendResponse({data: responseData});
                        } else {
                            const msg = `Unable to load ${url} ${response.status} ${response.statusText}`;
                            console.error(msg);
                            sendResponse({error: msg});
                        }
                    })
                    .catch((error) => {
                        console.error(`Unable to load ${url} ${error}`);
                        sendResponse({error});
                    });

                // Should return `true` synchronously to make `sendResponse` work in Chrome
                return true;
            }
        });
    }

    async updateContentScript() {
        (await queryTabs({}))
            .filter((tab) => canInjectScript(tab.url))
            .filter((tab) => !this.ports.has(tab.id))
            .forEach((tab) => chrome.tabs.executeScript(tab.id, {
                runAt: 'document_start',
                file: 'inject/index.js',
            }));
    }

    async sendMessage(getMessage: (url?: string) => any) {
        (await queryTabs({}))
            .filter((tab) => this.ports.has(tab.id))
            .forEach((tab) => {
                const message = getMessage(tab.url);
                const port = this.ports.get(tab.id);
                if (tab.active) {
                    port.postMessage(message);
                } else {
                    setTimeout(() => port.postMessage(message));
                }
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
            isInDarkList: isUrlInList(url, DARK_SITES),
        };
    }
}
