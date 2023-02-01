import {isFirefox} from '../utils/platform';
import type {ExtensionData, FilterConfig, TabInfo, Message, UserSettings, DevToolsData} from '../definitions';
import {MessageType} from '../utils/message';
import {makeFirefoxHappy} from './make-firefox-happy';

export interface ExtensionAdapter {
    collect: () => Promise<ExtensionData>;
    collectDevToolsData: () => Promise<DevToolsData>;
    changeSettings: (settings: Partial<UserSettings>) => void;
    setTheme: (theme: Partial<FilterConfig>) => void;
    markNewsAsRead: (ids: string[]) => Promise<void>;
    markNewsAsDisplayed: (ids: string[]) => Promise<void>;
    toggleActiveTab: () => void;
    loadConfig: (options: {local: boolean}) => Promise<void>;
    applyDevDynamicThemeFixes: (json: string) => Error;
    resetDevDynamicThemeFixes: () => void;
    applyDevInversionFixes: (json: string) => Error;
    resetDevInversionFixes: () => void;
    applyDevStaticThemes: (text: string) => Error;
    resetDevStaticThemes: () => void;
}

export default class Messenger {
    private static adapter: ExtensionAdapter;
    private static changeListenerCount: number;

    public static init(adapter: ExtensionAdapter) {
        Messenger.adapter = adapter;
        Messenger.changeListenerCount = 0;

        chrome.runtime.onMessage.addListener(Messenger.messageListener);

        // This is a work-around for Firefox bug which does not permit responding to onMessage handler above.
        if (isFirefox) {
            chrome.runtime.onConnect.addListener(Messenger.firefoxPortListener);
        }
    }

    private static messageListener(message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response: {data?: ExtensionData | DevToolsData | TabInfo; error?: string} | 'unsupportedSender') => void) {
        if (isFirefox && makeFirefoxHappy(message, sender, sendResponse)) {
            return;
        }
        const allowedSenderURL = [
            chrome.runtime.getURL('/ui/popup/index.html'),
            chrome.runtime.getURL('/ui/devtools/index.html'),
            chrome.runtime.getURL('/ui/stylesheet-editor/index.html')
        ];
        if (allowedSenderURL.includes(sender.url!)) {
            Messenger.onUIMessage(message, sendResponse);
            return ([
                MessageType.UI_GET_DATA,
                MessageType.UI_GET_DEVTOOLS_DATA,
            ].includes(message.type));
        }
    }

    private static firefoxPortListener(port: chrome.runtime.Port) {
        let promise: Promise<ExtensionData | DevToolsData | TabInfo | null>;
        switch (port.name) {
            case MessageType.UI_GET_DATA:
                promise = Messenger.adapter.collect();
                break;
            case MessageType.UI_GET_DEVTOOLS_DATA:
                promise = Messenger.adapter.collectDevToolsData();
                break;
            // These types require data, so we need to add a listener to the port.
            case MessageType.UI_APPLY_DEV_DYNAMIC_THEME_FIXES:
            case MessageType.UI_APPLY_DEV_INVERSION_FIXES:
            case MessageType.UI_APPLY_DEV_STATIC_THEMES:
                promise = new Promise((resolve, reject) => {
                    port.onMessage.addListener((message: Message) => {
                        const {data} = message;
                        let error: Error;
                        switch (port.name) {
                            case MessageType.UI_APPLY_DEV_DYNAMIC_THEME_FIXES:
                                error = Messenger.adapter.applyDevDynamicThemeFixes(data);
                                break;
                            case MessageType.UI_APPLY_DEV_INVERSION_FIXES:
                                error = Messenger.adapter.applyDevInversionFixes(data);
                                break;
                            case MessageType.UI_APPLY_DEV_STATIC_THEMES:
                                error = Messenger.adapter.applyDevStaticThemes(data);
                                break;
                            default:
                                throw new Error(`Unknown port name: ${port.name}`);
                        }
                        if (error) {
                            reject(error);
                        } else {
                            resolve(null);
                        }
                    });
                });
                break;
            default:
                return;
        }
        promise.then((data) => port.postMessage({data}))
            .catch((error) => port.postMessage({error}));
    }

    private static onUIMessage({type, data}: Message, sendResponse: (response: {data?: ExtensionData | DevToolsData | TabInfo; error?: string}) => void) {
        switch (type) {
            case MessageType.UI_GET_DATA:
                Messenger.adapter.collect().then((data) => sendResponse({data}));
                break;
            case MessageType.UI_GET_DEVTOOLS_DATA:
                Messenger.adapter.collectDevToolsData().then((data) => sendResponse({data}));
                break;
            case MessageType.UI_SUBSCRIBE_TO_CHANGES:
                Messenger.changeListenerCount++;
                break;
            case MessageType.UI_UNSUBSCRIBE_FROM_CHANGES:
                Messenger.changeListenerCount--;
                break;
            case MessageType.UI_CHANGE_SETTINGS:
                Messenger.adapter.changeSettings(data);
                break;
            case MessageType.UI_SET_THEME:
                Messenger.adapter.setTheme(data);
                break;
            case MessageType.UI_TOGGLE_ACTIVE_TAB:
                Messenger.adapter.toggleActiveTab();
                break;
            case MessageType.UI_MARK_NEWS_AS_READ:
                Messenger.adapter.markNewsAsRead(data);
                break;
            case MessageType.UI_MARK_NEWS_AS_DISPLAYED:
                Messenger.adapter.markNewsAsDisplayed(data);
                break;
            case MessageType.UI_LOAD_CONFIG:
                Messenger.adapter.loadConfig(data);
                break;
            case MessageType.UI_APPLY_DEV_DYNAMIC_THEME_FIXES: {
                const error = Messenger.adapter.applyDevDynamicThemeFixes(data);
                sendResponse({error: (error ? error.message : undefined)});
                break;
            }
            case MessageType.UI_RESET_DEV_DYNAMIC_THEME_FIXES:
                Messenger.adapter.resetDevDynamicThemeFixes();
                break;
            case MessageType.UI_APPLY_DEV_INVERSION_FIXES: {
                const error = Messenger.adapter.applyDevInversionFixes(data);
                sendResponse({error: (error ? error.message : undefined)});
                break;
            }
            case MessageType.UI_RESET_DEV_INVERSION_FIXES:
                Messenger.adapter.resetDevInversionFixes();
                break;
            case MessageType.UI_APPLY_DEV_STATIC_THEMES: {
                const error = Messenger.adapter.applyDevStaticThemes(data);
                sendResponse({error: error ? error.message : undefined});
                break;
            }
            case MessageType.UI_RESET_DEV_STATIC_THEMES:
                Messenger.adapter.resetDevStaticThemes();
                break;
            default:
                break;
        }
    }

    public static reportChanges(data: ExtensionData) {
        if (Messenger.changeListenerCount > 0) {
            chrome.runtime.sendMessage<Message>({
                type: MessageType.BG_CHANGES,
                data
            });
        }
    }
}
