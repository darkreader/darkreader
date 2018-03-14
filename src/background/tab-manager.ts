
import {canInjectScript, isUrlInList} from './utils';
import ConfigManager from './config-manager';
import {TabInfo} from '../definitions';

function queryTabs(query: chrome.tabs.QueryInfo) {
    return new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query(query, (tabs) => resolve(tabs));
    });
}

type CodeGenerator = (url?: string) => string;

export default class TabManager {
    private config: ConfigManager;
    private updaters: Map<CodeGenerator, {update, replace}>;

    constructor(config: ConfigManager) {
        this.config = config;
        this.updaters = new Map();
    }

    async getActiveTabInfo() {
        const [tab] = await queryTabs({
            active: true,
            lastFocusedWindow: true
        });
        const {DARK_SITES} = this.config;
        const url = tab.url;
        return {
            url: tab.url,
            isProtected: !canInjectScript(url),
            isInDarkList: isUrlInList(url, DARK_SITES),
        };
    }

    injectScript(tab: chrome.tabs.Tab, getCode: CodeGenerator) {
        if (!canInjectScript(tab.url)) {
            return;
        }
        chrome.tabs.executeScript(tab.id, {
            code: getCode(tab.url),
            runAt: 'document_start'
        });
    }

    async injectScriptToAll(getCode: CodeGenerator) {
        const tabs = await queryTabs({});
        tabs.forEach((tab) => {
            // Run script for active tabs immediately
            if (tab.active) {
                this.injectScript(tab, getCode);
            } else {
                setTimeout(() => this.injectScript(tab, getCode));
            }
        });
    }

    injectOnUpdate(getCode: CodeGenerator) {
        if (this.updaters.has(getCode)) {
            return;
        }

        const update = (tabId, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
            console.log(`Tab updated: ${tab.id}, status: ${info.status}`);
            this.injectScript(tab, getCode);
        };
        const replace = (addedTabId, replacedTabId) => {
            console.log(`Tab ${replacedTabId} replaced with ${addedTabId}`);
            chrome.tabs.get(addedTabId, (tab) => this.injectScript(tab, getCode));
        };
        this.updaters.set(getCode, {update, replace});

        // Replace fires instead of update when page loaded from cache
        // https://bugs.chromium.org/p/chromium/issues/detail?id=109557
        // https://bugs.chromium.org/p/chromium/issues/detail?id=116379
        chrome.tabs.onUpdated.addListener(update);
        chrome.tabs.onReplaced.addListener(replace);
    }

    stopInjecting(getCode: CodeGenerator) {
        if (this.updaters.has(getCode)) {
            const {update, replace} = this.updaters.get(getCode);
            this.updaters.delete(getCode);
            chrome.tabs.onUpdated.removeListener(update);
            chrome.tabs.onReplaced.removeListener(replace);
        }
    }
}
