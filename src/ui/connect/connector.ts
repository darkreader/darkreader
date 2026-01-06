import type {ExtensionData, ExtensionActions, Theme, UserSettings, DevToolsData, MessageUItoBG, MessageBGtoUI} from '../../definitions';
import {MessageTypeBGtoUI, MessageTypeUItoBG} from '../../utils/message';

export default class Connector implements ExtensionActions {
    private changeSubscribers: Set<(data: ExtensionData) => void>;

    constructor() {
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

    async getData(): Promise<ExtensionData> {
        return await this.sendRequest<ExtensionData>(MessageTypeUItoBG.GET_DATA);
    }

    async getDevToolsData(): Promise<DevToolsData> {
        return await this.sendRequest<DevToolsData>(MessageTypeUItoBG.GET_DEVTOOLS_DATA);
    }

    private onChangesReceived = ({type, data}: MessageBGtoUI) => {
        if (type === MessageTypeBGtoUI.CHANGES) {
            this.changeSubscribers.forEach((callback) => callback(data));
        }
    };

    subscribeToChanges(callback: (data: ExtensionData) => void): void {
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
    async setShortcut(command: string, shortcut: string): Promise<string | null> {
        // Chrome doesn't support programmatic shortcut updates
        return null;
    }

    changeSettings(settings: Partial<UserSettings>): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.CHANGE_SETTINGS, data: settings});
    }

    setTheme(theme: Partial<Theme>): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.SET_THEME, data: theme});
    }

    toggleActiveTab(): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.TOGGLE_ACTIVE_TAB, data: {}});
    }

    markNewsAsRead(ids: string[]): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.MARK_NEWS_AS_READ, data: ids});
    }

    markNewsAsDisplayed(ids: string[]): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.MARK_NEWS_AS_DISPLAYED, data: ids});
    }

    loadConfig(options: {local: boolean}): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.LOAD_CONFIG, data: options});
    }

    async applyDevDynamicThemeFixes(text: string): Promise<void> {
        return await this.sendRequest<void>(MessageTypeUItoBG.APPLY_DEV_DYNAMIC_THEME_FIXES, text);
    }

    resetDevDynamicThemeFixes(): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.RESET_DEV_DYNAMIC_THEME_FIXES});
    }

    async applyDevInversionFixes(text: string): Promise<void> {
        return await this.sendRequest<void>(MessageTypeUItoBG.APPLY_DEV_INVERSION_FIXES, text);
    }

    resetDevInversionFixes(): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.RESET_DEV_INVERSION_FIXES});
    }

    async applyDevStaticThemes(text: string): Promise<void> {
        return await this.sendRequest<void>(MessageTypeUItoBG.APPLY_DEV_STATIC_THEMES, text);
    }

    resetDevStaticThemes(): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.RESET_DEV_STATIC_THEMES});
    }

    startActivation(email: string, key: string): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.START_ACTIVATION, data: {email, key}});
    }

    resetActivation(): void {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.RESET_ACTIVATION});
    }

    async hideHighlights(ids: string[]): Promise<void> {
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.HIDE_HIGHLIGHTS, data: ids});
    }

    disconnect(): void {
        if (this.changeSubscribers.size > 0) {
            this.changeSubscribers.clear();
            chrome.runtime.onMessage.removeListener(this.onChangesReceived);
            chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.UNSUBSCRIBE_FROM_CHANGES});
        }
    }
}
