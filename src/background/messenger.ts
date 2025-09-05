import type {
    ExtensionData,
    Theme,
    TabInfo,
    MessageUItoBG,
    UserSettings,
    MessageCStoBG,
    MessageBGtoUI,
} from '../definitions';
import {MessageTypeBGtoUI, MessageTypeUItoBG} from '../utils/message';
import {isFirefox} from '../utils/platform';

import {makeFirefoxHappy} from './make-firefox-happy';
import {ASSERT} from './utils/log';

export interface ExtensionAdapter {
  collect: () => Promise<ExtensionData>;
  changeSettings: (settings: Partial<UserSettings>) => void;
  setTheme: (theme: Partial<Theme>) => void;
  toggleActiveTab: () => void;
  loadConfig: (options: { local: boolean }) => Promise<void>;
  hideHighlights: (ids: string[]) => Promise<void>;
}

export default class Messenger {
    private static adapter: ExtensionAdapter;
    private static changeListenerCount: number;

    static init(adapter: ExtensionAdapter): void {
        Messenger.adapter = adapter;
        Messenger.changeListenerCount = 0;

        chrome.runtime.onMessage.addListener(Messenger.messageListener);

        // This is a work-around for Firefox bug which does not permit responding to onMessage handler above.
        if (isFirefox) {
            chrome.runtime.onConnect.addListener(Messenger.firefoxPortListener);
        }
    }

    private static messageListener(
        message: MessageUItoBG | MessageCStoBG,
        sender: chrome.runtime.MessageSender,
        sendResponse: (
      response:
        | { data?: ExtensionData | TabInfo; error?: string }
        | 'unsupportedSender'
    ) => void
    ) {
        if (isFirefox && makeFirefoxHappy(message, sender, sendResponse)) {
            return;
        }
        const allowedSenderURL = [
            chrome.runtime.getURL('/ui/popup/index.html'),
            chrome.runtime.getURL('/ui/options/index.html'),
        ];
        if (allowedSenderURL.includes(sender.url!)) {
            Messenger.onUIMessage(message as MessageUItoBG, sendResponse);
            return [
                MessageTypeUItoBG.GET_DATA,
            ].includes(message.type as MessageTypeUItoBG);
        }
    }

    private static firefoxPortListener(port: chrome.runtime.Port) {
        ASSERT(
            'Messenger.firefoxPortListener() is used only on Firefox',
            isFirefox
        );

        if (!isFirefox) {
            return;
        }

        let promise: Promise<ExtensionData | TabInfo | null>;
        switch (port.name) {
            case MessageTypeUItoBG.GET_DATA:
                promise = Messenger.adapter.collect();
                break;
                // These types require data, so we need to add a listener to the port.
            case MessageTypeUItoBG.APPLY_DEV_DYNAMIC_THEME_FIXES:
            case MessageTypeUItoBG.APPLY_DEV_INVERSION_FIXES:
            case MessageTypeUItoBG.APPLY_DEV_STATIC_THEMES:
                promise = new Promise(() => {
                    port.onMessage.addListener(
                        () => {
                            switch (port.name) {
                                default:
                                    throw new Error(`Unknown port name: ${port.name}`);
                            }
                        }
                    );
                });
                break;
            default:
                return;
        }
        promise
            .then((data) => port.postMessage({data}))
            .catch((error) => port.postMessage({error}));
    }

    private static onUIMessage(
        {type, data}: MessageUItoBG,
        sendResponse: (response: {
      data?: ExtensionData | TabInfo;
      error?: string;
    }) => void
    ) {
        switch (type) {
            case MessageTypeUItoBG.GET_DATA:
                Messenger.adapter.collect().then((data) => sendResponse({data}));
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
            case MessageTypeUItoBG.LOAD_CONFIG:
                Messenger.adapter.loadConfig(data);
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
