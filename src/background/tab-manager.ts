import {canInjectScript} from '../background/utils/extension-api';
import type {MessageBGtoCS, MessageCStoBG, MessageUItoBG} from '../definitions';
import {MessageTypeCStoBG, MessageTypeBGtoCS, MessageTypeUItoBG} from '../utils/message';
import {isFirefox} from '../utils/platform';
import {StateManager} from '../utils/state-manager';
import {getActiveTab, queryTabs} from '../utils/tabs';
import {getURLHostOrProtocol} from '../utils/url';
import IconManager from './icon-manager';

import {makeFirefoxHappy} from './make-firefox-happy';
import {ASSERT, logInfo, logWarn} from './utils/log';
import type {FileLoader} from './utils/network';
import {createFileLoader} from './utils/network';
import {isPanel} from './utils/tab';

declare const __CHROMIUM_MV2__: boolean;
declare const __CHROMIUM_MV3__: boolean;
declare const __THUNDERBIRD__: boolean;

interface TabManagerOptions {
    getConnectionMessage: (tabURl: string, url: string, isTopFrame: boolean, topFrameHasDarkTheme?: boolean) => Promise<MessageBGtoCS>;
    getTabMessage: (tabURL: string, url: string, isTopFrame: boolean) => MessageBGtoCS;
    onColorSchemeChange: (isDark: boolean) => void;
}

interface DocumentInfo {
    scriptId: string;
    documentId: string | null;
    isTop: true | undefined;
    url: string | null;
    state: DocumentState;
    timestamp: number;
    darkThemeDetected: boolean;
}

interface TabManagerState extends Record<string, unknown> {
    tabs: {[tabId: number]: {[frameId: number]: DocumentInfo}};
    timestamp: number;
}

/**
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

/**
 * Note: On Chromium builds, we use documentId if it is available.
 * We avoid messaging using frameId entirely since when document is pre-rendered, it gets a temporary frameId
 * and if we attempt to send to {frameId, documentId} with old frameId, then the message will be dropped.
 */
export default class TabManager {
    private static tabs: TabManagerState['tabs'];
    private static stateManager: StateManager<TabManagerState>;
    private static fileLoader: FileLoader | null = null;
    private static onColorSchemeChange: TabManagerOptions['onColorSchemeChange'];
    private static getTabMessage: TabManagerOptions['getTabMessage'];
    private static timestamp: TabManagerState['timestamp'];
    private static readonly LOCAL_STORAGE_KEY = 'TabManager-state';

    static init({getConnectionMessage, onColorSchemeChange, getTabMessage}: TabManagerOptions): void {
        TabManager.stateManager = new StateManager<TabManagerState>(TabManager.LOCAL_STORAGE_KEY, this, {tabs: {}, timestamp: 0}, logWarn);
        TabManager.tabs = {};
        TabManager.onColorSchemeChange = onColorSchemeChange;
        TabManager.getTabMessage = getTabMessage;

        chrome.runtime.onMessage.addListener((message: MessageCStoBG | MessageUItoBG, sender, sendResponse): boolean => {
            if (isFirefox && makeFirefoxHappy(message, sender, sendResponse)) {
                return false;
            }
            switch (message.type) {
                case MessageTypeCStoBG.DOCUMENT_CONNECT: {
                    if (__CHROMIUM_MV3__ && isPanel(sender)) {
                        sendResponse({
                            type: MessageTypeBGtoCS.UNSUPPORTED_SENDER,
                        });
                        return false;
                    }
                    TabManager.onColorSchemeMessage(message, sender);

                    const reply = (tabURL: string, url: string, isTopFrame: boolean, topFrameHasDarkTheme?: boolean) => {
                        getConnectionMessage(tabURL, url, isTopFrame, topFrameHasDarkTheme).then((response) => {
                            if (!response) {
                                return;
                            }
                            response.scriptId = message.scriptId!;
                            TabManager.sendDocumentMessage(sender.tab!.id!, sender.documentId!, response, sender.frameId!);
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
                                        scriptId: message.scriptId!,
                                    },
                                    {
                                        frameId: sender && typeof sender.frameId === 'number' ? sender.frameId : undefined,
                                    });
                            }
                        } else {
                            sendResponse('unsupportedSender');
                        }
                        return false;
                    }

                    const {frameId} = sender;
                    const isTopFrame: boolean = (__CHROMIUM_MV2__ || __CHROMIUM_MV3__) ? (frameId === 0 || message.data.isTopFrame) : frameId === 0;
                    const url = sender.url!;
                    const tabId = sender.tab!.id!;
                    const scriptId = message.scriptId!;
                    // Chromium 106+ may prerender frames resulting in top-level frames with chrome.runtime.MessageSender.tab.url
                    // set to chrome://newtab/ and positive chrome.runtime.MessageSender.frameId
                    const tabURL = ((__CHROMIUM_MV2__ || __CHROMIUM_MV3__) && isTopFrame) ? url : sender.tab!.url!;
                    const documentId: string | null = __CHROMIUM_MV3__ ? sender.documentId! : (sender.documentId || null);

                    TabManager.stateManager.loadState().then(() => {
                        TabManager.addFrame(tabId, frameId!, documentId, scriptId, url, isTopFrame);
                        const topFrameHasDarkTheme = isTopFrame ? false : TabManager.tabs[tabId]?.[0]?.darkThemeDetected;
                        reply(tabURL, url, isTopFrame, topFrameHasDarkTheme);
                        TabManager.stateManager.saveState();
                    });
                    break;
                }

                case MessageTypeCStoBG.DOCUMENT_FORGET:
                    if (!sender.tab) {
                        logWarn('Unexpected message', message, sender);
                        break;
                    }
                    ASSERT('Has a scriptId', () => Boolean(message.scriptId));
                    TabManager.removeFrame(sender.tab!.id!, sender.frameId!);
                    break;

                case MessageTypeCStoBG.DOCUMENT_FREEZE: {
                    TabManager.stateManager.loadState().then(() => {
                        const info = TabManager.tabs[sender.tab!.id!][sender.frameId!];
                        info.state = DocumentState.FROZEN;
                        info.url = null;
                        TabManager.stateManager.saveState();
                    });
                    break;
                }

                case MessageTypeCStoBG.DOCUMENT_RESUME: {
                    TabManager.onColorSchemeMessage(message, sender);
                    const tabId = sender.tab!.id!;
                    const tabURL = sender.tab!.url!;
                    const frameId = sender.frameId!;
                    const url = sender.url!;
                    const documentId: string | null = __CHROMIUM_MV3__ ? sender.documentId! : (sender.documentId! || null);
                    const isTopFrame: boolean = (__CHROMIUM_MV2__ || __CHROMIUM_MV3__) ? (frameId === 0 || message.data.isTopFrame) : frameId === 0;
                    TabManager.stateManager.loadState().then(() => {
                        if (TabManager.tabs[tabId][frameId].timestamp < TabManager.timestamp) {
                            const response = TabManager.getTabMessage(tabURL, url, isTopFrame);
                            response.scriptId = message.scriptId!;
                            TabManager.sendDocumentMessage(tabId, documentId!, response, frameId!);
                        }
                        TabManager.tabs[sender.tab!.id!][sender.frameId!] = {
                            documentId,
                            scriptId: message.scriptId!,
                            url,
                            isTop: isTopFrame || undefined,
                            state: DocumentState.ACTIVE,
                            darkThemeDetected: false,
                            timestamp: TabManager.timestamp,
                        };
                        TabManager.stateManager.saveState();
                    });
                    break;
                }

                case MessageTypeCStoBG.DARK_THEME_DETECTED: {
                    const tabId = sender.tab!.id!;
                    const frames = TabManager.tabs[tabId];
                    if (!frames) {
                        break;
                    }
                    for (const entry of Object.entries(frames)) {
                        const frameId = Number(entry[0]);
                        const frame = entry[1];
                        frame.darkThemeDetected = true;
                        const {documentId, scriptId} = frame;
                        if (documentId) {
                            const message = {
                                type: MessageTypeBGtoCS.CLEAN_UP,
                                scriptId,
                            };
                            TabManager.sendDocumentMessage(tabId, documentId, message, frameId);
                        }
                        if (frameId === 0) {
                            IconManager.setIcon({tabId, isActive: false});
                        }
                    }
                    break;
                }

                case MessageTypeCStoBG.FETCH: {
                    // Using custom response due to Chrome and Firefox incompatibility
                    // Sometimes fetch error behaves like synchronous and sends `undefined`
                    const id = message.id;
                    // We do not need to use scriptId here since every request has a unique id already
                    const sendResponse = (response: Partial<MessageBGtoCS>) => {
                        TabManager.sendDocumentMessage(sender.tab!.id!, sender.documentId!, {type: MessageTypeBGtoCS.FETCH_RESPONSE, id, ...response}, sender.frameId!);
                    };

                    if (__THUNDERBIRD__) {
                        // In thunderbird some CSS is loaded on a chrome:// URL.
                        // Thunderbird restricted Add-ons to load those URL's.
                        if ((message.data.url as string).startsWith('chrome://')) {
                            sendResponse({data: null});
                            return false;
                        }
                    }
                    const {url, responseType, mimeType, origin} = message.data;
                    if (!TabManager.fileLoader) {
                        TabManager.fileLoader = createFileLoader();
                    }
                    TabManager.fileLoader.get({url, responseType, mimeType, origin}).then((response) => {
                        if (response.error) {
                            const err = response.error;
                            sendResponse({error: err?.message ?? err});
                        } else {
                            sendResponse({data: response.data});
                        }
                    });
                    return true;
                }

                case MessageTypeUItoBG.COLOR_SCHEME_CHANGE:
                    // fallthrough
                case MessageTypeCStoBG.COLOR_SCHEME_CHANGE:
                    TabManager.onColorSchemeMessage(message as MessageCStoBG, sender);
                    break;

                default:
                    break;
            }

            return false;
        });

        chrome.tabs.onRemoved.addListener(async (tabId) => TabManager.removeFrame(tabId, 0));
    }

    private static sendDocumentMessage(tabId: number, documentId: string, message: MessageBGtoCS, frameId: number) {
        if (frameId === 0) {
            const themeMessageTypes: MessageTypeBGtoCS[] = [
                MessageTypeBGtoCS.ADD_CSS_FILTER,
                MessageTypeBGtoCS.ADD_DYNAMIC_THEME,
                MessageTypeBGtoCS.ADD_STATIC_THEME,
                MessageTypeBGtoCS.ADD_SVG_FILTER,
            ];
            if (themeMessageTypes.includes(message.type)) {
                IconManager.setIcon({tabId, isActive: true, colorScheme: message.data?.theme?.mode ? 'dark' : 'light'});
            } else if (message.type === MessageTypeBGtoCS.CLEAN_UP) {
                const isActive = TabManager.tabs[tabId]?.[0]?.url?.startsWith('https://darkreader.org/');
                IconManager.setIcon({tabId, isActive});
            }
        }

        if (__CHROMIUM_MV3__) {
            // On MV3, Chromium has a bug which prevents sending messages to pre-rendered frames without specifying frameId
            // Furthermore, if we send a message addressed to a temporary frameId after the document exits prerender state,
            // the message will also fail to be delivered.
            //
            // To work around this:
            //  1. Attempt to send the message by documentId. If this fails, this means the document is in prerender state.
            //  2. Attempt to send the message by documentId and temporary frameId. If this fails, this means the document
            //     either already exited pre-rendered state or was discarded.
            //  3. Attempt to send the message by documentId (omitting the permanent frameId which is 0).If this fails, this
            //     means the document was already discarded.
            //
            // More info: https://crbug.com/1455817

            chrome.tabs.sendMessage<MessageBGtoCS>(tabId, message, {documentId}).catch(() =>
                chrome.tabs.sendMessage<MessageBGtoCS>(tabId, message, {frameId, documentId}).catch(() =>
                    chrome.tabs.sendMessage<MessageBGtoCS>(tabId, message, {documentId}).catch(() => { /* noop */ })
                )
            );
            return;
        }
        if (__CHROMIUM_MV2__) {
            chrome.tabs.sendMessage<MessageBGtoCS>(tabId, message, documentId ? {documentId} : {frameId});
            return;
        }
        chrome.tabs.sendMessage<MessageBGtoCS>(tabId, message, {frameId});
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

    private static addFrame(tabId: number, frameId: number, documentId: string | null, scriptId: string, url: string, isTop: boolean) {
        let frames: {[frameId: number]: DocumentInfo};
        if (TabManager.tabs[tabId]) {
            frames = TabManager.tabs[tabId];
        } else {
            frames = {};
            TabManager.tabs[tabId] = frames;
        }
        frames[frameId] = {
            documentId,
            scriptId,
            url,
            isTop: isTop || undefined,
            state: DocumentState.ACTIVE,
            darkThemeDetected: false,
            timestamp: TabManager.timestamp,
        };
    }

    private static async removeFrame(tabId: number, frameId: number) {
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

    static async cleanState() {
        await TabManager.stateManager.loadState();

        const actualTabs = await queryTabs({});
        const tabIds = Object.keys(TabManager.tabs).map((id) => Number(id));
        const staleTabs = new Set(tabIds);
        actualTabs.forEach((actualTab) => {
            const tabId = actualTab.id;
            if (tabId) {
                staleTabs.delete(tabId);
            }
        });
        staleTabs.forEach((staleTabId) => {
            if (TabManager.tabs[staleTabId]) {
                delete TabManager.tabs[staleTabId];
            }
        });

        TabManager.stateManager.saveState();
    }

    static async getTabURL(tab: chrome.tabs.Tab | null): Promise<string> {
        if (__CHROMIUM_MV3__) {
            if (!tab) {
                return 'about:blank';
            }
            try {
                return (await chrome.tabs.get(tab.id!)).url || 'about:blank';
            } catch (e) {
                try {
                    return (await chrome.scripting.executeScript({
                        target: {
                            tabId: tab.id!,
                            frameIds: [0],
                        },
                        world: 'MAIN',
                        injectImmediately: true,
                        func: () => window.location.href,
                    }))[0].result || 'about:blank';
                } catch (e) {
                    const errMessage = String(e);
                    if (
                        errMessage.includes('chrome://') ||
                        errMessage.includes('chrome-extension://') ||
                        errMessage.includes('gallery')
                    ) {
                        return 'chrome://protected';
                    }
                    return 'about:blank';
                }
            }
        }
        // It can happen in cases whereby the tab.url is empty.
        // Luckily this only and will only happen on `about:blank`-like pages.
        // Due to this we can safely use `about:blank` as fallback value.
        // In some extraordinary circumstances tab may be undefined.
        return tab && tab.url || 'about:blank';
    }

    static async updateContentScript(options: {runOnProtectedPages: boolean}): Promise<void> {
        (await queryTabs({discarded: false}))
            .filter((tab) => __CHROMIUM_MV3__ || options.runOnProtectedPages || canInjectScript(tab.url))
            .filter((tab) => !TabManager.tabs[tab.id!])
            .forEach((tab) => {
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
            });
    }

    static async registerMailDisplayScript(): Promise<void> {
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
    static async sendMessage(onlyUpdateActiveTab = false): Promise<void> {
        TabManager.timestamp++;

        const activeTabHostname = onlyUpdateActiveTab ? getURLHostOrProtocol(await TabManager.getActiveTabURL()) : null;

        (await queryTabs({discarded: false}))
            .filter((tab) => Boolean(TabManager.tabs[tab.id!]))
            .forEach((tab) => {
                const frames = TabManager.tabs[tab.id!];
                Object.entries(frames)
                    .filter(([, {state}]) => state === DocumentState.ACTIVE || state === DocumentState.PASSIVE)
                    .forEach(async ([id, {url, documentId, scriptId, isTop}]) => {
                        const frameId = Number(id);
                        const tabURL = await TabManager.getTabURL(tab);

                        // Check if hostname are equal when we only want to update active tab.
                        if (onlyUpdateActiveTab && getURLHostOrProtocol(tabURL) !== activeTabHostname) {
                            return;
                        }

                        const message = TabManager.getTabMessage(tabURL, url!, isTop || false);
                        message.scriptId = scriptId;

                        if (tab.active && isTop) {
                            TabManager.sendDocumentMessage(tab!.id!, documentId!, message, frameId);
                        } else {
                            setTimeout(() => {
                                TabManager.sendDocumentMessage(tab!.id!, documentId!, message, frameId);
                            });
                        }
                        if (TabManager.tabs[tab.id!][frameId]) {
                            TabManager.tabs[tab.id!][frameId].timestamp = TabManager.timestamp;
                        }
                    });
            });
    }

    static canAccessTab(tab: chrome.tabs.Tab | null): boolean {
        return tab && Boolean(TabManager.tabs[tab.id!]) || false;
    }

    static getTabDocumentId(tab: chrome.tabs.Tab | null): string | null {
        return tab && TabManager.tabs[tab.id!] && TabManager.tabs[tab.id!][0] && TabManager.tabs[tab.id!][0].documentId;
    }

    static isTabDarkThemeDetected(tab: chrome.tabs.Tab | null): boolean | null {
        return tab && TabManager.tabs[tab.id!] && TabManager.tabs[tab.id!][0] && TabManager.tabs[tab.id!][0].darkThemeDetected || null;
    }

    static async getActiveTabURL(): Promise<string> {
        return TabManager.getTabURL(await getActiveTab());
    }
}
