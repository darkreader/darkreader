import {canInjectScript} from '../background/utils/extension-api';
import {createFileLoader} from './utils/network';
import type {Message} from '../definitions';
import {isThunderbird} from '../utils/platform';
import {logInfo, logWarn} from '../inject/utils/log';
import {StateManager} from './utils/state-manager';

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
    onColorSchemeChange: ({isDark}: {isDark: boolean}) => void;
}

interface FrameInfo {
    url: string;
    state: DocumentState;
}

/*
 * These states correspond to possible document states in Page Lifecycle API:
 * https://developers.google.com/web/updates/2018/07/page-lifecycle-api#developer-recommendations-for-each-state
 * Some states are not currently used (they are declared for future-proofing).
 */
enum DocumentState {
    ACTIVE = 0,
    PASSIVE = 1,
    HIDDEN = 2,
    FROZEN = 3,
    TERMINATED = 4,
    DISCARDED = 5
}

export default class TabManager {
    private tabs: {[tabId: number]: {[frameId: number]: FrameInfo}};
    private stateManager: StateManager;
    static LOCAL_STORAGE_KEY = 'TabManager-state';

    constructor({getConnectionMessage, onColorSchemeChange}: TabManagerOptions) {
        this.stateManager = new StateManager(TabManager.LOCAL_STORAGE_KEY, this, {tabs: {}});
        this.tabs = {};

        chrome.runtime.onMessage.addListener(async (message, sender) => {
            function addFrame(tabs: {[tabId: number]: {[frameId: number]: FrameInfo}}, tabId: number, frameId: number, senderURL: string) {
                let frames: {[frameId: number]: FrameInfo};
                if (tabs[tabId]) {
                    frames = tabs[tabId];
                } else {
                    frames = {};
                    tabs[tabId] = frames;
                }
                frames[frameId] = {url: senderURL, state: DocumentState.ACTIVE};
            }

            await this.stateManager.loadState();

            switch (message.type) {
                case 'frame-connect': {
                    const reply = (options: ConnectionMessageOptions) => {
                        const message = getConnectionMessage(options);
                        if (message instanceof Promise) {
                            message.then((asyncMessage) => asyncMessage && chrome.tabs.sendMessage<Message>(sender.tab.id, asyncMessage, {frameId: sender.frameId}));
                        } else if (message) {
                            chrome.tabs.sendMessage<Message>(sender.tab.id, message, {frameId: sender.frameId});
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
                    const tabId = sender.tab.id;
                    const frameId = sender.frameId;

                    if (frameId === 0) {
                        delete this.tabs[tabId];
                    }

                    if (this.tabs[tabId] && this.tabs[tabId][frameId]) {
                        // We need to use delete here because Object.entries()
                        // in sendMessage() would enumerate undefined as well.
                        delete this.tabs[tabId][frameId];
                    }
                    break;
                }
                case 'frame-freeze':
                    this.tabs[sender.tab.id][sender.frameId].state = DocumentState.FROZEN;
                    break;
                case 'frame-resume':
                    addFrame(this.tabs, sender.tab.id, sender.frameId, sender.url);
                    break;
            }

            this.stateManager.saveState();
        });

        const fileLoader = createFileLoader();

        chrome.runtime.onMessage.addListener(async ({type, data, id}: Message, sender) => {
            if (type === 'fetch') {
                const {url, responseType, mimeType, origin} = data;

                // Using custom response due to Chrome and Firefox incompatibility
                // Sometimes fetch error behaves like synchronous and sends `undefined`
                const sendResponse = (response: Partial<Message>) => chrome.tabs.sendMessage<Message>(sender.tab.id, {type: 'fetch-response', id, ...response});
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
                chrome.tabs.sendMessage<Message>(activeTab.id, {type: 'export-css'}, {frameId: 0});
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
            .filter((tab) => !Boolean(this.tabs[tab.id]))
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
            .filter((tab) => Boolean(this.tabs[tab.id]))
            .forEach((tab) => {
                const frames = this.tabs[tab.id];
                Object.entries(frames).forEach(([_, {url, state}], frameId) => {
                    if (state !== DocumentState.ACTIVE && state !== DocumentState.PASSIVE) {
                        // TODO: avoid sending messages to frozen tabs for performance reasons.
                        logInfo('Sending message to a frozen tab.');
                    }
                    const message = getMessage(this.getTabURL(tab), frameId === 0 ? null : url);
                    if (tab.active && frameId === 0) {
                        chrome.tabs.sendMessage<Message>(tab.id, message, {frameId});
                    } else {
                        setTimeout(() => chrome.tabs.sendMessage<Message>(tab.id, message, {frameId}));
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
