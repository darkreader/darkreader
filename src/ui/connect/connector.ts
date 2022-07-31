import {isFirefox} from '../../utils/platform';
import type {ExtensionData, ExtensionActions, FilterConfig, Message, UserSettings, DevToolsPanelSettings} from '../../definitions';
import {MessageType} from '../../utils/message';

declare const __MV3__: boolean;

export const DEVTOOLS_PANEL_SETTINGS_STORAGE_KEY = 'DevTools_panel_enabled';

export default class Connector implements ExtensionActions {
    // MV2-only
    private changeSubscribers: Set<(data: ExtensionData) => void>;
    // MV3-only
    private extendedChangeSubscribers: Set<(data: {extensionData: ExtensionData; devToolsPanelSettings: DevToolsPanelSettings}) => void>;
    private extensionData: ExtensionData = null;
    private devToolsPanelSettings: DevToolsPanelSettings = {
        enabled: true,
    };

    constructor() {
        this.changeSubscribers = new Set();
        if (__MV3__) {
            this.extendedChangeSubscribers = new Set();
        }
    }

    private async sendRequest<T>(type: MessageType, data?: string) {
        return new Promise<T>((resolve, reject) => {
            chrome.runtime.sendMessage<Message>({type, data}, ({data, error}: Message) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    private async firefoxSendRequestWithResponse<T>(type: MessageType, data?: string) {
        return new Promise<T>((resolve, reject) => {
            const dataPort = chrome.runtime.connect({name: type});
            dataPort.onDisconnect.addListener(() => reject());
            dataPort.onMessage.addListener(({data, error}) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
                dataPort.disconnect();
            });
            data && dataPort.postMessage({data});
        });
    }

    async getData() {
        if (isFirefox) {
            return await this.firefoxSendRequestWithResponse<ExtensionData>(MessageType.UI_GET_DATA);
        }
        return await this.sendRequest<ExtensionData>(MessageType.UI_GET_DATA);
    }

    private onChangesReceived = ({type, data}: Message) => {
        if (type === MessageType.BG_CHANGES) {
            this.changeSubscribers.forEach((callback) => callback(data));
        }
    };

    subscribeToChanges(callback: (data: ExtensionData) => void) {
        this.changeSubscribers.add(callback);
        if (this.changeSubscribers.size === 1) {
            chrome.runtime.onMessage.addListener(this.onChangesReceived);
            chrome.runtime.sendMessage<Message>({type: MessageType.UI_SUBSCRIBE_TO_CHANGES});
        }
    }

    async getExtendedData() {
        return {
            extensionData: await this.getData(),
            devToolsPanelSettings: this.devToolsPanelSettings,
        };
    }

    private onStateChanged = () => {
        this.extendedChangeSubscribers.forEach((callback) => callback({
            extensionData: this.extensionData,
            devToolsPanelSettings: this.devToolsPanelSettings
        }));
    };

    private onExtendedChangesReceived = ({type, data}: Message) => {
        if (type === MessageType.BG_CHANGES) {
            this.extensionData = data;
            this.onStateChanged();
        }
    };

    private onStorageChanged = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
        if (changes[DEVTOOLS_PANEL_SETTINGS_STORAGE_KEY] && areaName === 'local') {
            this.devToolsPanelSettings = changes[DEVTOOLS_PANEL_SETTINGS_STORAGE_KEY].newValue;
            this.onStateChanged();
        }
    };

    subscribeToExtendedChanges(callback: (data: {extensionData: ExtensionData; devToolsPanelSettings: DevToolsPanelSettings}) => void) {
        if (!__MV3__) {
            throw new Error('Connector.subscribeToExtendedChanges() called with MV2.');
        }
        this.extendedChangeSubscribers.add(callback);
        if (this.extendedChangeSubscribers.size === 1) {
            chrome.runtime.onMessage.addListener(this.onExtendedChangesReceived);
            chrome.storage.onChanged.addListener(this.onStorageChanged);
            chrome.runtime.sendMessage<Message>({type: MessageType.UI_SUBSCRIBE_TO_CHANGES});
        }
    }

    setShortcut(command: string, shortcut: string) {
        chrome.runtime.sendMessage<Message>({type: MessageType.UI_SET_SHORTCUT, data: {command, shortcut}});
    }

    changeSettings(settings: Partial<UserSettings>) {
        chrome.runtime.sendMessage<Message>({type: MessageType.UI_CHANGE_SETTINGS, data: settings});
    }

    async changeDevTollsPanelSettings(settings: DevToolsPanelSettings): Promise<void> {
        this.devToolsPanelSettings = settings;
        await chrome.storage.local.set({[DEVTOOLS_PANEL_SETTINGS_STORAGE_KEY]: settings});
    }

    setTheme(theme: Partial<FilterConfig>) {
        chrome.runtime.sendMessage<Message>({type: MessageType.UI_SET_THEME, data: theme});
    }

    toggleActiveTab() {
        chrome.runtime.sendMessage<Message>({type: MessageType.UI_TOGGLE_ACTIVE_TAB, data: {}});
    }

    markNewsAsRead(ids: string[]) {
        chrome.runtime.sendMessage<Message>({type: MessageType.UI_MARK_NEWS_AS_READ, data: ids});
    }

    markNewsAsDisplayed(ids: string[]) {
        chrome.runtime.sendMessage<Message>({type: MessageType.UI_MARK_NEWS_AS_DISPLAYED, data: ids});
    }

    loadConfig(options: {local: boolean}) {
        chrome.runtime.sendMessage<Message>({type: MessageType.UI_LOAD_CONFIG, data: options});
    }

    async applyDevDynamicThemeFixes(text: string) {
        if (isFirefox) {
            return await this.firefoxSendRequestWithResponse<void>(MessageType.UI_APPLY_DEV_DYNAMIC_THEME_FIXES, text);
        }
        return await this.sendRequest<void>(MessageType.UI_APPLY_DEV_DYNAMIC_THEME_FIXES, text);
    }

    resetDevDynamicThemeFixes() {
        chrome.runtime.sendMessage<Message>({type: MessageType.UI_RESET_DEV_DYNAMIC_THEME_FIXES});
    }

    async applyDevInversionFixes(text: string) {
        if (isFirefox) {
            return await this.firefoxSendRequestWithResponse<void>(MessageType.UI_APPLY_DEV_INVERSION_FIXES, text);
        }
        return await this.sendRequest<void>(MessageType.UI_APPLY_DEV_INVERSION_FIXES, text);
    }

    resetDevInversionFixes() {
        chrome.runtime.sendMessage<Message>({type: MessageType.UI_RESET_DEV_INVERSION_FIXES});
    }

    async applyDevStaticThemes(text: string) {
        if (isFirefox) {
            return await this.firefoxSendRequestWithResponse<void>(MessageType.UI_APPLY_DEV_STATIC_THEMES, text);
        }
        return await this.sendRequest<void>(MessageType.UI_APPLY_DEV_STATIC_THEMES, text);
    }

    resetDevStaticThemes() {
        chrome.runtime.sendMessage<Message>({type: MessageType.UI_RESET_DEV_STATIC_THEMES});
    }

    disconnect() {
        if (this.changeSubscribers.size > 0) {
            this.changeSubscribers.clear();
            chrome.runtime.onMessage.removeListener(this.onChangesReceived);
            chrome.runtime.sendMessage<Message>({type: MessageType.UI_UNSUBSCRIBE_FROM_CHANGES});
        }
    }
}
