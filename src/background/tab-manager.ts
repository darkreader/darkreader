
import {isUrlInList} from '../utils/url';
import ConfigManager from './config-manager';
import {TabInfo} from '../definitions';

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
    }

    async sendMessage(getMessage: (url?: string) => any) {
        (await queryTabs({}))
            .filter((tab) => this.ports.has(tab.id))
            .forEach((tab) => {
                const message = getMessage(tab.url)
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
            isProtected: !this.ports.has(tab.id),
            isInDarkList: isUrlInList(url, DARK_SITES),
        };
    }
}
