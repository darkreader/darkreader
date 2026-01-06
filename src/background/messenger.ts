import type {ExtensionData, Theme, TabInfo, MessageUItoBG, UserSettings, DevToolsData, MessageCStoBG, MessageBGtoUI} from '../definitions';
import {MessageTypeBGtoUI, MessageTypeUItoBG} from '../utils/message';
import {HOMEPAGE_URL} from '../utils/links';

declare const __PLUS__: boolean;

export interface ExtensionAdapter {
    collect: () => Promise<ExtensionData>;
    collectDevToolsData: () => Promise<DevToolsData>;
    changeSettings: (settings: Partial<UserSettings>) => void;
    setTheme: (theme: Partial<Theme>) => void;
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
    startActivation: (email: string, key: string) => Promise<void>;
    resetActivation: () => Promise<void>;
    hideHighlights: (ids: string[]) => Promise<void>;
}

export default class Messenger {
    private static adapter: ExtensionAdapter;
    private static changeListenerCount: number;

    static init(adapter: ExtensionAdapter): void {
        Messenger.adapter = adapter;
        Messenger.changeListenerCount = 0;

        chrome.runtime.onMessage.addListener(Messenger.messageListener);
    }

    private static messageListener(message: MessageUItoBG | MessageCStoBG, sender: chrome.runtime.MessageSender, sendResponse: (response: {data?: ExtensionData | DevToolsData | TabInfo; error?: string} | 'unsupportedSender') => void) {
        const allowedSenderURL = [
            chrome.runtime.getURL('/ui/popup/index.html'),
            chrome.runtime.getURL('/ui/devtools/index.html'),
            chrome.runtime.getURL('/ui/options/index.html'),
            chrome.runtime.getURL('/ui/stylesheet-editor/index.html'),
        ];
        if (
            allowedSenderURL.includes(sender.url!) || (
                __PLUS__ &&
                message.type === MessageTypeUItoBG.CHANGE_SETTINGS &&
                sender.url?.startsWith(`${HOMEPAGE_URL}/plus/activate/`)
            )
        ) {
            Messenger.onUIMessage(message as MessageUItoBG, sendResponse);
            return ([
                MessageTypeUItoBG.GET_DATA,
                MessageTypeUItoBG.GET_DEVTOOLS_DATA,
            ].includes(message.type as MessageTypeUItoBG));
        }
    }

    private static onUIMessage({type, data}: MessageUItoBG, sendResponse: (response: {data?: ExtensionData | DevToolsData | TabInfo; error?: string}) => void) {
        switch (type) {
            case MessageTypeUItoBG.GET_DATA:
                Messenger.adapter.collect().then((data) => sendResponse({data}));
                break;
            case MessageTypeUItoBG.GET_DEVTOOLS_DATA:
                Messenger.adapter.collectDevToolsData().then((data) => sendResponse({data}));
                break;
            case MessageTypeUItoBG.SUBSCRIBE_TO_CHANGES:
                Messenger.changeListenerCount++;
                break;
            case MessageTypeUItoBG.UNSUBSCRIBE_FROM_CHANGES:
                Messenger.changeListenerCount--;
                break;
            case MessageTypeUItoBG.CHANGE_SETTINGS:
                Messenger.adapter.changeSettings(data);
                break;
            case MessageTypeUItoBG.SET_THEME:
                Messenger.adapter.setTheme(data);
                break;
            case MessageTypeUItoBG.TOGGLE_ACTIVE_TAB:
                Messenger.adapter.toggleActiveTab();
                break;
            case MessageTypeUItoBG.MARK_NEWS_AS_READ:
                Messenger.adapter.markNewsAsRead(data);
                break;
            case MessageTypeUItoBG.MARK_NEWS_AS_DISPLAYED:
                Messenger.adapter.markNewsAsDisplayed(data);
                break;
            case MessageTypeUItoBG.LOAD_CONFIG:
                Messenger.adapter.loadConfig(data);
                break;
            case MessageTypeUItoBG.APPLY_DEV_DYNAMIC_THEME_FIXES: {
                const error = Messenger.adapter.applyDevDynamicThemeFixes(data);
                sendResponse({error: (error ? error.message : undefined)});
                break;
            }
            case MessageTypeUItoBG.RESET_DEV_DYNAMIC_THEME_FIXES:
                Messenger.adapter.resetDevDynamicThemeFixes();
                break;
            case MessageTypeUItoBG.APPLY_DEV_INVERSION_FIXES: {
                const error = Messenger.adapter.applyDevInversionFixes(data);
                sendResponse({error: (error ? error.message : undefined)});
                break;
            }
            case MessageTypeUItoBG.RESET_DEV_INVERSION_FIXES:
                Messenger.adapter.resetDevInversionFixes();
                break;
            case MessageTypeUItoBG.APPLY_DEV_STATIC_THEMES: {
                const error = Messenger.adapter.applyDevStaticThemes(data);
                sendResponse({error: error ? error.message : undefined});
                break;
            }
            case MessageTypeUItoBG.RESET_DEV_STATIC_THEMES:
                Messenger.adapter.resetDevStaticThemes();
                break;
            case MessageTypeUItoBG.START_ACTIVATION:
                Messenger.adapter.startActivation(data.email, data.key);
                break;
            case MessageTypeUItoBG.RESET_ACTIVATION:
                Messenger.adapter.resetActivation();
                break;
            case MessageTypeUItoBG.HIDE_HIGHLIGHTS:
                Messenger.adapter.hideHighlights(data);
                break;
            default:
                break;
        }
    }

    static reportChanges(data: ExtensionData): void {
        if (Messenger.changeListenerCount > 0) {
            chrome.runtime.sendMessage<MessageBGtoUI>({
                type: MessageTypeBGtoUI.CHANGES,
                data,
            });
        }
    }
}
