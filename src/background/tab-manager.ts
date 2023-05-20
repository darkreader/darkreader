import {canInjectScript} from '../background/utils/extension-api';
import {createFileLoader} from './utils/network';
import type {FetchRequestParameters} from './utils/network';
import type {MessageBGtoCS, MessageCStoBG, MessageUItoBG, documentId, frameId, tabId} from '../definitions';
import {isFirefox} from '../utils/platform';
import {MessageTypeCStoBG, MessageTypeBGtoCS, MessageTypeUItoBG} from '../utils/message';
import {ASSERT, logInfo, logWarn} from './utils/log';
import {StateManager} from '../utils/state-manager';
import {getURLHostOrProtocol} from '../utils/url';
import {isPanel} from './utils/tab';
import {makeFirefoxHappy} from './make-firefox-happy';
import {getActiveTab, queryTabs} from '../utils/tabs';

declare const __CHROMIUM_MV2__: boolean;
declare const __CHROMIUM_MV3__: boolean;
declare const __FIREFOX_MV2__: boolean;
declare const __THUNDERBIRD__: boolean;

interface TabManagerOptions {
    getConnectionMessage: (tabURl: string, url: string, isTopFrame: boolean) => Promise<MessageBGtoCS>;
    getTabMessage: (tabURL: string, url: string, isTopFrame: boolean) => MessageBGtoCS;
    onColorSchemeChange: (isDark: boolean) => void;
}

interface DocumentInfo {
    documentId: documentId | null;
    url: string | null;
    state: DocumentState;
    timestamp: number;
    darkThemeDetected: boolean;
}

interface TabManagerState extends Record<string, unknown> {
    tabs: {[tabId: tabId]: {[frameId: frameId]: DocumentInfo}};
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
    DISCARDED = 5
}

export default class TabManager {
    private static tabs: TabManagerState['tabs'];
    private static stateManager: StateManager<TabManagerState>;
    private static fileLoader: {get: (params: FetchRequestParameters) => Promise<string | null>} | null = null;
    private static onColorSchemeChange: TabManagerOptions['onColorSchemeChange'];
    private static getTabMessage: TabManagerOptions['getTabMessage'];
    private static timestamp: TabManagerState['timestamp'];
    private static readonly LOCAL_STORAGE_KEY = 'TabManager-state';

    public static init({getConnectionMessage, onColorSchemeChange, getTabMessage}: TabManagerOptions): void {
        TabManager.stateManager = new StateManager<TabManagerState>(TabManager.LOCAL_STORAGE_KEY, this, {tabs: {}, timestamp: 0}, logWarn);
        TabManager.tabs = {};
        TabManager.onColorSchemeChange = onColorSchemeChange;
        TabManager.getTabMessage = getTabMessage;

        chrome.runtime.onMessage.addListener(async (message: MessageCStoBG | MessageUItoBG, sender, sendResponse) => {
            if (isFirefox && makeFirefoxHappy(message, sender, sendResponse)) {
                return;
            }
            switch (message.type) {
                case MessageTypeCStoBG.FRAME_CONNECT: {
                    TabManager.onColorSchemeMessage(message, sender);
                    await TabManager.stateManager.loadState();
                    const reply = (tabURL: string, url: string, isTopFrame: boolean) => {
                        getConnectionMessage(tabURL, url, isTopFrame).then((message) => {
                            message && chrome.tabs.sendMessage<MessageBGtoCS>(sender.tab!.id!, message,
                                (__CHROMIUM_MV3__ || __CHROMIUM_MV2__ && (sender as any).documentId) ? {frameId: sender.frameId, documentId: (sender as any).documentId} as chrome.tabs.MessageSendOptions : {frameId: sender.frameId});
                        });
                    };

                    if (isPanel(sender)) {
                        // NOTE: Vivaldi and Opera can show a page in a side panel,
                        // but it is not possible to handle messaging correctly (no tab ID, frame ID).
                        if (isFirefox) {
                            if (sender && sender.tab && typeof sender.tab.id === 'number') {
                                chrome.tabs.sendMessage<MessageBGtoCS>(sender.tab.id,
                                    {
                                        type: MessageTypeBGtoCS.UNSUPPORTED_SENDER,
                                    },
                                    {
                                        frameId: sender && typeof sender.frameId === 'number' ? sender.frameId : undefined,
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
                    const documentId: documentId = (__CHROMIUM_MV3__ || __CHROMIUM_MV2__) ? (sender as any).documentId : ((__FIREFOX_MV2__ || __THUNDERBIRD__) ? (sender as any).contextId : null);

                    TabManager.addFrame(tabId, frameId!, documentId, url, TabManager.timestamp);

                    reply(tabURL, url, frameId === 0);
                    TabManager.stateManager.saveState();
                    break;
                }

                case MessageTypeCStoBG.FRAME_FORGET:
                    if (!sender.tab) {
                        logWarn('Unexpected message', message, sender);
                        break;
                    }
                    TabManager.removeFrame(sender.tab!.id!, sender.frameId!);
                    break;

                case MessageTypeCStoBG.FRAME_FREEZE: {
                    await TabManager.stateManager.loadState();
                    const info = TabManager.tabs[sender.tab!.id!][sender.frameId!];
                    info.state = DocumentState.FROZEN;
                    info.url = null;
                    TabManager.stateManager.saveState();
                    break;
                }

                case MessageTypeCStoBG.FRAME_RESUME: {
                    TabManager.onColorSchemeMessage(message, sender);
                    await TabManager.stateManager.loadState();
                    const tabId = sender.tab!.id!;
                    const tabURL = sender.tab!.url!;
                    const frameId = sender.frameId!;
                    const url = sender.url!;
                    const documentId: documentId = (__CHROMIUM_MV3__ || __CHROMIUM_MV2__ && (sender as any).documentId) ? (sender as any).documentId : null;
                    if (TabManager.tabs[tabId][frameId].timestamp < TabManager.timestamp) {
                        const message = TabManager.getTabMessage(tabURL, url, frameId === 0);
                        chrome.tabs.sendMessage<MessageBGtoCS>(tabId, message,
                            (__CHROMIUM_MV3__ || __CHROMIUM_MV2__ && (sender as any).documentId) ? {frameId, documentId} as chrome.tabs.MessageSendOptions : {frameId});
                    }
                    TabManager.tabs[sender.tab!.id!][sender.frameId!] = {
                        documentId,
                        url,
                        state: DocumentState.ACTIVE,
                        darkThemeDetected: false,
                        timestamp: TabManager.timestamp,
                    };
                    TabManager.stateManager.saveState();
                    break;
                }

                case MessageTypeCStoBG.DARK_THEME_DETECTED:
                    TabManager.tabs[sender.tab!.id!][sender.frameId!].darkThemeDetected = true;
                    break;

                case MessageTypeCStoBG.FETCH: {
                    // Using custom response due to Chrome and Firefox incompatibility
                    // Sometimes fetch error behaves like synchronous and sends `undefined`
                    const id = message.id;
                    const sendResponse = (response: Partial<MessageBGtoCS>) => {
                        chrome.tabs.sendMessage<MessageBGtoCS>(sender.tab!.id!, {type: MessageTypeBGtoCS.FETCH_RESPONSE, id, ...response}, (__CHROMIUM_MV3__ || __CHROMIUM_MV2__ && (sender as any).documentId) ? {frameId: sender.frameId, documentId: (sender as any).documentId} as chrome.tabs.MessageSendOptions : {frameId: sender.frameId});
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
                        if (!TabManager.fileLoader) {
                            TabManager.fileLoader = createFileLoader();
                        }
                        const response = await TabManager.fileLoader.get({url, responseType, mimeType, origin});
                        sendResponse({data: response});
                    } catch (err) {
                        sendResponse({error: err && err.message ? err.message : err});
                    }
                    break;
                }

                case MessageTypeUItoBG.COLOR_SCHEME_CHANGE:
                    // fallthrough
                case MessageTypeCStoBG.COLOR_SCHEME_CHANGE:
                    TabManager.onColorSchemeMessage(message as MessageCStoBG, sender);
                    break;

                case MessageTypeUItoBG.SAVE_FILE: {
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

                default:
                    break;
            }
        });

        chrome.tabs.onRemoved.addListener(async (tabId) => TabManager.removeFrame(tabId, 0));
    }

    private static onColorSchemeMessage(message: MessageCStoBG, sender: chrome.runtime.MessageSender) {
        ASSERT('TabManager.onColorSchemeMessage is set', () => Boolean(TabManager.onColorSchemeChange));

        // We honor only messages which come from tab's top frame
        // because sub-frames color scheme can be overridden by style with prefers-color-scheme
        // TODO(MV3): instead of dropping these messages, consider making a query to an authoritative source
        // like offscreen document
        if (sender && sender.frameId === 0) {
            TabManager.onColorSchemeChange(message.data.isDark);
        }
    }

    private static addFrame(tabId: tabId, frameId: frameId, documentId: documentId, url: string, timestamp: number) {
        let frames: {[frameId: frameId]: DocumentInfo};
        if (TabManager.tabs[tabId]) {
            frames = TabManager.tabs[tabId];
        } else {
            frames = {};
            TabManager.tabs[tabId] = frames;
        }
        frames[frameId] = {
            documentId,
            url,
            state: DocumentState.ACTIVE,
            darkThemeDetected: false,
            timestamp,
        };
    }

    private static async removeFrame(tabId: tabId, frameId: frameId) {
        await TabManager.stateManager.loadState();

        if (frameId === 0) {
            delete TabManager.tabs[tabId];
        }

        if (TabManager.tabs[tabId] && TabManager.tabs[tabId][frameId]) {
            // We need to use delete here because Object.entries()
            // in sendMessage() would enumerate undefined as well.
            delete TabManager.tabs[tabId][frameId];
        }

        TabManager.stateManager.saveState();
    }

    private static async getTabURL(tab: chrome.tabs.Tab | null): Promise<string> {
        if (__CHROMIUM_MV3__) {
            if (!tab) {
                return 'abou:blank';
            }
            try {
                if (TabManager.tabs[tab.id!] && TabManager.tabs[tab.id!][0]) {
                    return TabManager.tabs[tab.id!][0].url || 'about:blank';
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
        // In some extraordinary circumstances tab may be undefined.
        return tab && tab.url || 'about:blank';
    }

    public static async updateContentScript(options: {runOnProtectedPages: boolean}): Promise<void> {
        (await queryTabs())
            .filter((tab) => __CHROMIUM_MV3__ || options.runOnProtectedPages || canInjectScript(tab.url))
            .filter((tab) => !Boolean(TabManager.tabs[tab.id!]))
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

    public static async registerMailDisplayScript(): Promise<void> {
        await (chrome as any).messageDisplayScripts.register({
            js: [
                {file: '/inject/fallback.js'},
                {file: '/inject/index.js'},
            ],
        });
    }

    // sendMessage will send a tab messages to all active tabs and their frames.
    // If onlyUpdateActiveTab is specified, it will only send a new message to any
    // tab that matches the active tab's hostname. This is to ensure that when a user
    // has multiple tabs of the same website, every tab will receive the new message
    // and not just that tab as Dark Reader currently doesn't have per-tab operations,
    // this should be the expected behavior.
    public static async sendMessage(onlyUpdateActiveTab = false): Promise<void> {
        TabManager.timestamp++;

        const activeTabHostname = onlyUpdateActiveTab ? getURLHostOrProtocol(await TabManager.getActiveTabURL()) : null;

        (await queryTabs())
            .filter((tab) => Boolean(TabManager.tabs[tab.id!]))
            .forEach((tab) => {
                const frames = TabManager.tabs[tab.id!];
                Object.entries(frames)
                    .filter(([, {state}]) => state === DocumentState.ACTIVE || state === DocumentState.PASSIVE)
                    .forEach(async ([id, {url, documentId}]) => {
                        const frameId = Number(id);
                        const tabURL = await TabManager.getTabURL(tab);
                        // Check if hostname are equal when we only want to update active tab.
                        if (onlyUpdateActiveTab && getURLHostOrProtocol(tabURL) !== activeTabHostname) {
                            return;
                        }

                        const message = TabManager.getTabMessage(tabURL, url!, frameId === 0);
                        if (tab.active && frameId === 0) {
                            chrome.tabs.sendMessage<MessageBGtoCS>(tab.id!, message, (__CHROMIUM_MV3__ || __CHROMIUM_MV2__ && documentId) ? {frameId, documentId} as chrome.tabs.MessageSendOptions : {frameId});
                        } else {
                            setTimeout(() => {
                                chrome.tabs.sendMessage<MessageBGtoCS>(tab.id!, message, (__CHROMIUM_MV3__ || __CHROMIUM_MV2__ && documentId) ? {frameId, documentId} as chrome.tabs.MessageSendOptions : {frameId});
                            });
                        }
                        if (TabManager.tabs[tab.id!][frameId]) {
                            TabManager.tabs[tab.id!][frameId].timestamp = TabManager.timestamp;
                        }
                    });
            });
    }

    public static async canAccessActiveTab(): Promise<boolean> {
        const tab = await getActiveTab();
        return tab && Boolean(TabManager.tabs[tab.id!]) || false;
    }

    public static async isActiveTabDarkThemeDetected(): Promise<boolean | null> {
        const tab = await getActiveTab();
        if (!tab) {
            return null;
        }
        return TabManager.tabs[tab.id!] && TabManager.tabs[tab.id!][0] && TabManager.tabs[tab.id!][0].darkThemeDetected || null;
    }

    public static async getActiveTabURL(): Promise<string> {
        return TabManager.getTabURL(await getActiveTab());
    }
}
