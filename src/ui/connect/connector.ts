import {isFirefox} from '../../utils/platform';
import type {ExtensionData, ExtensionActions, FilterConfig, Message, UserSettings, DevToolsData} from '../../definitions';
import {MessageType} from '../../utils/message';

declare const browser: {
    commands: {
        update({name, shortcut}: chrome.commands.Command): Promise<void>;
        getAll(): Promise<chrome.commands.Command[]>;
    };
};

export default class Connector implements ExtensionActions {
    private changeSubscribers: Set<(data: ExtensionData) => void>;

    constructor() {
        this.changeSubscribers = new Set();
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

    async getDevToolsData() {
        if (isFirefox) {
            return await this.firefoxSendRequestWithResponse<DevToolsData>(MessageType.UI_GET_DEVTOOLS_DATA);
        }
        return await this.sendRequest<DevToolsData>(MessageType.UI_GET_DEVTOOLS_DATA);
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

    /**
     *
     * @param command The command to be updated
     * @param shortcut The new shortcut pattern after the operation completes
     */
    async setShortcut(command: string, shortcut: string) {
        if (isFirefox && typeof browser !== 'undefined' && browser.commands && browser.commands.update && browser.commands.getAll) {
            try {
                await browser.commands.update({name: command, shortcut});
            } catch {
                // Ignore this error
            }
            // Query the real shortcut to get the exact value displayed by Firefox on about:addons
            // or in case user has non-standard keyboard layout
            const commands = await browser.commands.getAll();
            const cmd = commands.find((cmd) => cmd.name === command);
            return cmd && cmd.shortcut || null;
        }
        return null;
    }

    changeSettings(settings: Partial<UserSettings>) {
        chrome.runtime.sendMessage<Message>({type: MessageType.UI_CHANGE_SETTINGS, data: settings});
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
