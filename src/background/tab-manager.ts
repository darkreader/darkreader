import {canInjectScript} from '../background/utils/extension-api';
import {createFileLoader} from './utils/network';
import type {Message} from '../definitions';
import {isThunderbird} from '../utils/platform';
import {logInfo, logWarn} from '../inject/utils/log';

async function queryTabs(query: chrome.tabs.QueryInfo) {
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

interface FrameInfo {
    url: string;
    state: 'normal' | 'frozen';
}

export default class TabManager {
    private tabs: Map<number, Map<number, FrameInfo>>;

    constructor({getConnectionMessage, onColorSchemeChange}: TabManagerOptions) {
        this.tabs = new Map();
        chrome.runtime.onMessage.addListener((message, sender) => {
            function addFrame(tabs: any, tabId: number, frameId: number, senderURL: string) {
                let frames: Map<number, FrameInfo>;
                if (tabs.has(tabId)) {
                    frames = tabs.get(tabId);
                } else {
                    frames = new Map();
                    tabs.set(tabId, frames);
                }
                frames.set(frameId, {url: senderURL, state: 'normal'});
            }

            switch (message.type) {
                case 'frame-connect': {
                    const reply = (options: ConnectionMessageOptions) => {
                        const message = getConnectionMessage(options);
                        if (message instanceof Promise) {
                            message.then((asyncMessage) => asyncMessage && chrome.tabs.sendMessage(sender.tab.id, asyncMessage, {frameId: sender.frameId}));
                        } else if (message) {
                            chrome.tabs.sendMessage(sender.tab.id, message, {frameId: sender.frameId});
                        }
                    };

                    const isPanel = sender.tab == null;
                    if (isPanel) {
                        // NOTE: Vivaldi and Opera can show a page in a side panel,
                        // but it is not possible to handle messaging correctly (no tab ID, frame ID).
                        reply({url: sender.url, frameURL: null, unsupportedSender: true});
                        return;
                    }

                    const tabId = sender.tab.id;
                    const {frameId} = sender;
                    const senderURL = sender.url;
                    const tabURL = sender.tab.url;

                    addFrame(this.tabs, tabId, frameId, senderURL);

                    reply({
                        url: tabURL,
                        frameURL: frameId === 0 ? null : senderURL,
                    });
                    break;
                }
                case 'frame-forget': {
                    if (!sender.tab) {
                        logWarn('Unexpected message', message, sender);
                        break;
                    }

                    const framesForDeletion = this.tabs.get(sender.tab.id);
                    framesForDeletion && framesForDeletion.delete(sender.frameId);
                    break;
                }
                case 'frame-freeze':
                    this.tabs.get(sender.tab.id).get(sender.frameId).state = 'frozen';
                    break;
                case 'frame-resume':
                    addFrame(this.tabs, sender.tab.id, sender.frameId, sender.url);
                    break;
            }
        });

        const fileLoader = createFileLoader();

        chrome.runtime.onMessage.addListener(async ({type, data, id}: Message, sender) => {
            if (type === 'fetch') {
                const {url, responseType, mimeType, origin} = data;

                // Using custom response due to Chrome and Firefox incompatibility
                // Sometimes fetch error behaves like synchronous and sends `undefined`
                const sendResponse = (response) => chrome.tabs.sendMessage(sender.tab.id, {type: 'fetch-response', id, ...response});
                if (isThunderbird) {
                    // In thunderbird some CSS is loaded on a chrome:// URL.
                    // Thunderbird restricted Add-ons to load those URL's.
                    if ((url as string).startsWith('chrome://')) {
                        sendResponse({data: null});
                        return;
                    }
                }
                try {
                    const response = await fileLoader.get({url, responseType, mimeType, origin});
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
                chrome.tabs.sendMessage(activeTab.id, {type: 'export-css'}, {frameId: 0});
            }
        });
    }

    getTabURL(tab: chrome.tabs.Tab): string {
        // It can happen in cases whereby the tab.url is empty.
        // Luckily this only and will only happen on `about:blank`-like pages.
        // Due to this we can safely use `about:blank` as fallback value.
        return tab.url || 'about:blank';
    }

    async updateContentScript(options: {runOnProtectedPages: boolean}) {
        (await queryTabs({}))
            .filter((tab) => options.runOnProtectedPages || canInjectScript(tab.url))
            .filter((tab) => !this.tabs.has(tab.id))
            .forEach((tab) => {
                if (!tab.discarded) {
                    chrome.tabs.executeScript(tab.id, {
                        runAt: 'document_start',
                        file: '/inject/index.js',
                        allFrames: true,
                        matchAboutBlank: true,
                    });
                }
            });
    }

    async registerMailDisplayScript() {
        await (chrome as any).messageDisplayScripts.register({
            js: [
                {file: '/inject/fallback.js'},
                {file: '/inject/index.js'},
            ]
        });
    }

    async sendMessage(getMessage: (url: string, frameUrl: string) => any) {
        (await queryTabs({}))
            .filter((tab) => this.tabs.has(tab.id))
            .forEach((tab) => {
                const frames = this.tabs.get(tab.id);
                frames.forEach(({url, state}, frameId) => {
                    if (state === 'frozen') {
                        // TODO: avoid sending messages to frozen tabs for performance reasons.
                        logInfo('Sending message to a frozen tab.');
                    }
                    const message = getMessage(this.getTabURL(tab), frameId === 0 ? null : url);
                    if (tab.active && frameId === 0) {
                        chrome.tabs.sendMessage(tab.id, message, {frameId});
                    } else {
                        setTimeout(() => chrome.tabs.sendMessage(tab.id, message, {frameId}));
                    }
                });
            });
    }

    async getActiveTabURL() {
        return this.getTabURL(await this.getActiveTab());
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
