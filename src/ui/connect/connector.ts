import {isFirefox} from '../../utils/platform';
import type {ExtensionData, ExtensionActions, FilterConfig, UserSettings, DevToolsData, MessageUItoBG, MessageBGtoUI} from '../../definitions';
import {MessageTypeBGtoUI, MessageTypeUItoBG} from '../../utils/message';

declare const browser: {
    commands: {
        update({name, shortcut}: chrome.commands.Command): Promise<void>;
        getAll(): Promise<chrome.commands.Command[]>;
    };
};

export default class Connector implements ExtensionActions {
    private changeSubscribers: Set<(data: ExtensionData) => void>;

    public constructor() {
        this.changeSubscribers = new Set();
    }

    private async sendRequest<T>(type: MessageTypeUItoBG, data?: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            chrome.runtime.sendMessage<MessageUItoBG>({type, data}, ({data, error}: MessageUItoBG) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    private async firefoxSendRequestWithResponse<T>(type: MessageTypeUItoBG, data?: string): Promise<T> {
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

    public async getData(): Promise<ExtensionData> {
        if (isFirefox) {
            return await this.firefoxSendRequestWithResponse<ExtensionData>(MessageTypeUItoBG.GET_DATA);
        }
        return await this.sendRequest<ExtensionData>(MessageTypeUItoBG.GET_DATA);
    }

    public async getDevToolsData(): Promise<DevToolsData> {
        if (isFirefox) {
            return await this.firefoxSendRequestWithResponse<DevToolsData>(MessageTypeUItoBG.GET_DEVTOOLS_DATA);
        }
        return await this.sendRequest<DevToolsData>(MessageTypeUItoBG.GET_DEVTOOLS_DATA);
    }

    private onChangesReceived = ({type, data}: MessageBGtoUI) => {
        if (type === MessageTypeBGtoUI.CHANGES) {
            this.changeSubscribers.forEach((callback) => callback(data));
        }
    };

    public subscribeToChanges(callback: (data: ExtensionData) => void): void {
        this.changeSubscribers.add(callback);
        if (this.changeSubscribers.size === 1) {
            chrome.runtime.onMessage.addListener(this.onChangesReceived);
            chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.SUBSCRIBE_TO_CHANGES});
        }
    }

    /**
     *
     * @param command The command to be updated
     * @param shortcut The new shortcut pattern after the operation completes
     */
    public async setShortcut(command: string, shortcut: string): Promise<string | null> {
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

    public changeSettings(settings: Partial<UserSettings>): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.CHANGE_SETTINGS, data: settings});
    }

    public setTheme(theme: Partial<FilterConfig>): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.SET_THEME, data: theme});
    }

    public toggleActiveTab(): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.TOGGLE_ACTIVE_TAB, data: {}});
    }

    public markNewsAsRead(ids: string[]): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.MARK_NEWS_AS_READ, data: ids});
    }

    public markNewsAsDisplayed(ids: string[]): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.MARK_NEWS_AS_DISPLAYED, data: ids});
    }

    public loadConfig(options: {local: boolean}): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.LOAD_CONFIG, data: options});
    }

    public async applyDevDynamicThemeFixes(text: string): Promise<void> {
        if (isFirefox) {
            return await this.firefoxSendRequestWithResponse<void>(MessageTypeUItoBG.APPLY_DEV_DYNAMIC_THEME_FIXES, text);
        }
        return await this.sendRequest<void>(MessageTypeUItoBG.APPLY_DEV_DYNAMIC_THEME_FIXES, text);
    }

    public resetDevDynamicThemeFixes(): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.RESET_DEV_DYNAMIC_THEME_FIXES});
    }

    public async applyDevInversionFixes(text: string): Promise<void> {
        if (isFirefox) {
            return await this.firefoxSendRequestWithResponse<void>(MessageTypeUItoBG.APPLY_DEV_INVERSION_FIXES, text);
        }
        return await this.sendRequest<void>(MessageTypeUItoBG.APPLY_DEV_INVERSION_FIXES, text);
    }

    public resetDevInversionFixes(): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.RESET_DEV_INVERSION_FIXES});
    }

    public async applyDevStaticThemes(text: string): Promise<void> {
        if (isFirefox) {
            return await this.firefoxSendRequestWithResponse<void>(MessageTypeUItoBG.APPLY_DEV_STATIC_THEMES, text);
        }
        return await this.sendRequest<void>(MessageTypeUItoBG.APPLY_DEV_STATIC_THEMES, text);
    }

    public resetDevStaticThemes(): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.RESET_DEV_STATIC_THEMES});
    }

    public async hideHighlights(ids: string[]): Promise<void> {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.HIDE_HIGHLIGHTS, data: ids});
    }

    public disconnect(): void {
        if (this.changeSubscribers.size > 0) {
            this.changeSubscribers.clear();
            chrome.runtime.onMessage.removeListener(this.onChangesReceived);
            chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.UNSUBSCRIBE_FROM_CHANGES});
        }
    }
}
