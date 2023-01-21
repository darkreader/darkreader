import {canInjectScript} from '../background/utils/extension-api';
import {createFileLoader} from './utils/network';
import type {FetchRequestParameters} from './utils/network';
import type {Message} from '../definitions';
import {isFirefox} from '../utils/platform';
import {MessageType} from '../utils/message';
import {logInfo, logWarn} from './utils/log';
import {StateManager} from '../utils/state-manager';
import {getURLHostOrProtocol} from '../utils/url';
import {isPanel} from './utils/tab';
import {makeFirefoxHappy} from './make-firefox-happy';

declare const __CHROMIUM_MV3__: boolean;
declare const __THUNDERBIRD__: boolean;

interface TabManagerOptions {
    getConnectionMessage: (tabURl: string, url: string, isTopFrame: boolean) => Promise<Message>;
    getTabMessage: (tabURL: string, url: string, isTopFrame: boolean) => Message;
    onColorSchemeChange: (isDark: boolean) => void;
}

interface FrameInfo {
    url?: string | null;
    state: DocumentState;
    timestamp: number;
    darkThemeDetected?: boolean;
}

interface TabManagerState extends Record<string, unknown> {
    tabs: {[tabId: number]: {[frameId: number]: FrameInfo}};
    timestamp: number;
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
    DISCARDED = 5,
}

export default class TabManager {
    private static tabs: {[tabId: number]: {[frameId: number]: FrameInfo}};
    private static stateManager: StateManager<TabManagerState>;
    private static fileLoader: {get: (params: FetchRequestParameters) => Promise<string | null>} | null = null;
    private static getTabMessage: (tabURL: string, url: string, isTopFrame: boolean) => Message;
    private static timestamp = 0;
    private static readonly LOCAL_STORAGE_KEY = 'TabManager-state';

    static init({getConnectionMessage, onColorSchemeChange, getTabMessage}: TabManagerOptions) {
        this.stateManager = new StateManager<TabManagerState>(TabManager.LOCAL_STORAGE_KEY, this, {tabs: {}, timestamp: 0}, logWarn);
        this.tabs = {};
        this.getTabMessage = getTabMessage;

        chrome.runtime.onMessage.addListener(async (message: Message, sender, sendResponse) => {
            if (isFirefox && makeFirefoxHappy(message, sender, sendResponse)) {
                return;
            }
            switch (message.type) {
                case MessageType.CS_FRAME_CONNECT: {
                    onColorSchemeChange(message.data.isDark);
                    await this.stateManager.loadState();
                    const reply = (tabURL: string, url: string, isTopFrame: boolean) => {
                        getConnectionMessage(tabURL, url, isTopFrame).then((message) => {
                            message && chrome.tabs.sendMessage<Message>(sender.tab!.id!, message, {frameId: sender.frameId});
                        });
                    };

                    if (isPanel(sender)) {
                        // NOTE: Vivaldi and Opera can show a page in a side panel,
                        // but it is not possible to handle messaging correctly (no tab ID, frame ID).
                        if (isFirefox) {
                            if (sender && sender.tab && typeof sender.tab.id === 'number') {
                                chrome.tabs.sendMessage<Message>(sender.tab.id,
                                    {
                                        type: MessageType.BG_UNSUPPORTED_SENDER
                                    },
                                    {
                                        frameId: sender && typeof sender.frameId === 'number' ? sender.frameId : undefined
                                    });
                            }
                        } else {
                            sendResponse('unsupportedSender');
                        }
                        return;
                    }

                    const tabId = sender.tab!.id!;
                    const tabURL = sender.tab!.url!;
                    const {frameId} = sender;
                    const url = sender.url!;

                    this.addFrame(tabId, frameId!, url, this.timestamp);

                    reply(tabURL, url, frameId === 0);
                    this.stateManager.saveState();
                    break;
                }
                case MessageType.CS_FRAME_FORGET:
                    if (!sender.tab) {
                        logWarn('Unexpected message', message, sender);
                        break;
                    }
                    this.removeFrame(sender.tab!.id!, sender.frameId!);
                    break;
                case MessageType.CS_FRAME_FREEZE: {
                    await this.stateManager.loadState();
                    const info = this.tabs[sender.tab!.id!][sender.frameId!];
                    info.state = DocumentState.FROZEN;
                    info.url = null;
                    this.stateManager.saveState();
                    break;
                }
                case MessageType.CS_FRAME_RESUME: {
                    onColorSchemeChange(message.data.isDark);
                    await this.stateManager.loadState();
                    const tabId = sender.tab!.id!;
                    const tabURL = sender.tab!.url!;
                    const frameId = sender.frameId!;
                    const url = sender.url!;
                    if (this.tabs[tabId][frameId].timestamp < this.timestamp) {
                        const message = this.getTabMessage(tabURL, url, frameId === 0);
                        chrome.tabs.sendMessage<Message>(tabId, message, {frameId});
                    }
                    this.tabs[sender.tab!.id!][sender.frameId!] = {
                        url: sender.url,
                        state: DocumentState.ACTIVE,
                        timestamp: this.timestamp,
                    };
                    this.stateManager.saveState();
                    break;
                }
                case MessageType.CS_DARK_THEME_DETECTED:
                    this.tabs[sender.tab!.id!][sender.frameId!].darkThemeDetected = true;
                    break;

                case MessageType.CS_FETCH: {
                    // Using custom response due to Chrome and Firefox incompatibility
                    // Sometimes fetch error behaves like synchronous and sends `undefined`
                    const id = message.id;
                    const sendResponse = (response: Partial<Message>) => {
                        chrome.tabs.sendMessage<Message>(sender.tab!.id!, {type: MessageType.BG_FETCH_RESPONSE, id, ...response}, {frameId: sender.frameId});
                    };

                    if (__THUNDERBIRD__) {
                        // In thunderbird some CSS is loaded on a chrome:// URL.
                        // Thunderbird restricted Add-ons to load those URL's.
                        if ((message.data.url as string).startsWith('chrome://')) {
                            sendResponse({data: null});
                            return;
                        }
                    }
                    try {
                        const {url, responseType, mimeType, origin} = message.data;
                        if (!this.fileLoader) {
                            this.fileLoader = createFileLoader();
                        }
                        const response = await this.fileLoader.get({url, responseType, mimeType, origin});
                        sendResponse({data: response});
                    } catch (err) {
                        sendResponse({error: err && err.message ? err.message : err});
                    }
                    break;
                }

                case MessageType.UI_COLOR_SCHEME_CHANGE:
                    // fallthrough
                case MessageType.CS_COLOR_SCHEME_CHANGE:
                    onColorSchemeChange(message.data.isDark);
                    break;

                case MessageType.UI_SAVE_FILE: {
                    if (__CHROMIUM_MV3__) {
                        break;
                    }
                    const {content, name} = message.data;
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(new Blob([content]));
                    a.download = name;
                    a.click();
                    break;
                }

                case MessageType.UI_REQUEST_EXPORT_CSS: {
                    const activeTab = await this.getActiveTab();
                    chrome.tabs.sendMessage<Message>(activeTab.id!, {type: MessageType.BG_EXPORT_CSS}, {frameId: 0});
                    break;
                }

                default:
                    break;
            }
        });

        chrome.tabs.onRemoved.addListener(async (tabId) => this.removeFrame(tabId, 0));
    }

    private static async queryTabs(query: chrome.tabs.QueryInfo = {}) {
        return new Promise<chrome.tabs.Tab[]>((resolve) =>
            chrome.tabs.query(query, resolve)
        );
    }

    private static addFrame(tabId: number, frameId: number, url: string, timestamp: number) {
        let frames: {[frameId: number]: FrameInfo};
        if (this.tabs[tabId]) {
            frames = this.tabs[tabId];
        } else {
            frames = {};
            this.tabs[tabId] = frames;
        }
        frames[frameId] = {
            url,
            state: DocumentState.ACTIVE,
            timestamp,
        };
    }

    private static async removeFrame(tabId: number, frameId: number) {
        await this.stateManager.loadState();

        if (frameId === 0) {
            delete this.tabs[tabId];
        }

        if (this.tabs[tabId] && this.tabs[tabId][frameId]) {
            // We need to use delete here because Object.entries()
            // in sendMessage() would enumerate undefined as well.
            delete this.tabs[tabId][frameId];
        }

        this.stateManager.saveState();
    }

    private static async getTabURL(tab: chrome.tabs.Tab): Promise<string> {
        if (__CHROMIUM_MV3__) {
            try {
                if (this.tabs[tab.id!] && this.tabs[tab.id!][0]) {
                    return this.tabs[tab.id!][0].url || 'about:blank';
                }
                return (await chrome.scripting.executeScript({
                    target: {
                        tabId: tab.id!,
                        frameIds: [0],
                    },
                    func: () => window.location.href,
                }))[0].result;
            } catch (e) {
                return 'about:blank';
            }
        }
        // It can happen in cases whereby the tab.url is empty.
        // Luckily this only and will only happen on `about:blank`-like pages.
        // Due to this we can safely use `about:blank` as fallback value.
        return tab.url || 'about:blank';
    }

    static async updateContentScript(options: {runOnProtectedPages: boolean}) {
        (await this.queryTabs())
            .filter((tab) => __CHROMIUM_MV3__ || options.runOnProtectedPages || canInjectScript(tab.url))
            .filter((tab) => !Boolean(this.tabs[tab.id!]))
            .forEach((tab) => {
                if (!tab.discarded) {
                    if (__CHROMIUM_MV3__) {
                        chrome.scripting.executeScript({
                            target: {
                                tabId: tab.id!,
                                allFrames: true,
                            },
                            files: ['/inject/index.js'],
                        }, () => logInfo('Could not update content script in tab', tab, chrome.runtime.lastError));
                    } else {
                        chrome.tabs.executeScript(tab.id!, {
                            runAt: 'document_start',
                            file: '/inject/index.js',
                            allFrames: true,
                            matchAboutBlank: true,
                        });
                    }
                }
            });
    }

    static async registerMailDisplayScript() {
        await (chrome as any).messageDisplayScripts.register({
            js: [
                {file: '/inject/fallback.js'},
                {file: '/inject/index.js'},
            ]
        });
    }

    // sendMessage will send a tab messages to all active tabs and their frames.
    // If onlyUpdateActiveTab is specified, it will only send a new message to any
    // tab that matches the active tab's hostname. This is to ensure that when a user
    // has multiple tabs of the same website, every tab will receive the new message
    // and not just that tab as Dark Reader currently doesn't have per-tab operations,
    // this should be the expected behavior.
    static async sendMessage(onlyUpdateActiveTab = false) {
        this.timestamp++;

        const activeTabHostname = onlyUpdateActiveTab ? getURLHostOrProtocol(await this.getActiveTabURL()) : null;

        (await this.queryTabs())
            .filter((tab) => Boolean(this.tabs[tab.id!]))
            .forEach((tab) => {
                const frames = this.tabs[tab.id!];
                Object.entries(frames)
                    .filter(([, {state}]) => state === DocumentState.ACTIVE || state === DocumentState.PASSIVE)
                    .forEach(async ([id, {url}]) => {
                        const frameId = Number(id);
                        const tabURL = await this.getTabURL(tab);
                        // Check if hostname are equal when we only want to update active tab.
                        if (onlyUpdateActiveTab && getURLHostOrProtocol(tabURL) !== activeTabHostname) {
                            return;
                        }

                        const message = this.getTabMessage(tabURL, url!, frameId === 0);
                        if (tab.active && frameId === 0) {
                            chrome.tabs.sendMessage<Message>(tab.id!, message, {frameId});
                        } else {
                            setTimeout(() => {
                                chrome.tabs.sendMessage<Message>(tab.id!, message, {frameId});
                            });
                        }
                        if (this.tabs[tab.id!][frameId]) {
                            this.tabs[tab.id!][frameId].timestamp = this.timestamp;
                        }
                    });
            });
    }

    static async canAccessActiveTab(): Promise<boolean> {
        const tab = await this.getActiveTab();
        return Boolean(this.tabs[tab.id!]);
    }

    static async isActiveTabDarkThemeDetected(): Promise<boolean | null> {
        const tab = await this.getActiveTab();
        return this.tabs[tab.id!] && this.tabs[tab.id!][0] && this.tabs[tab.id!][0].darkThemeDetected || null;
    }

    static async getActiveTabURL() {
        return this.getTabURL(await this.getActiveTab());
    }

    static async getActiveTab() {
        let tab = (await this.queryTabs({
            active: true,
            lastFocusedWindow: true,
            // Explicitly exclude Dark Reader's Dev Tools and other special windows from the query
            windowType: 'normal',
        }))[0];
        if (!tab) {
            // When Dark Reader's DevTools are open, last focused window might be the DevTools window
            // so we lift this restriction and try again (with the best guess)
            tab = (await this.queryTabs({
                active: true,
                windowType: 'normal',
            }))[0];
            logWarn('TabManager.getActiveTab() could not reliably find the active tab, picking the best guess', tab);
        }
        return tab;
    }
}
