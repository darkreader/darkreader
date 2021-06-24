import {isChromium, isFirefox} from 'utils/platform';
import type {ExtensionData, ExtensionActions, FilterConfig, TabInfo, Message, UserSettings} from '../../definitions';

export default class Connector implements ExtensionActions {
    private changeSubscribers: Set<(data: ExtensionData) => void>;

    constructor() {
        this.changeSubscribers = new Set();
    }

    private async sendRequest<T>(request: Message) {
        return new Promise<T>((resolve, reject) => {
            chrome.runtime.sendMessage({name: 'ui', ...request}, ({data, error}) => {
                if (error)
                    reject(error);
                else
                    resolve(data);
            });
        });
    }

    private async poorMansSendRequest<T>(name: string) {
        return new Promise<T>((resolve, reject) => {
            const dataPort = chrome.runtime.connect({name});
            dataPort.onDisconnect.addListener(() => reject());
            dataPort.onMessage.addListener(({data, error}) => {
                if (error)
                    reject(error);
                else {
                    resolve(data);
                }
                dataPort.disconnect();
            });
        });
    }

    async getData() {
        if (isFirefox)
            return this.poorMansSendRequest<ExtensionData>('ui-get-data');
        return await this.sendRequest<ExtensionData>({type: 'get-data'});
    }

    async getActiveTabInfo() {
        if (isFirefox)
            return this.poorMansSendRequest<TabInfo>('ui-get-active-tab-info');
        return await this.sendRequest<TabInfo>({type: 'get-active-tab-info'});
    }

    private onChangesReceived = ({name, type, data}: Message) => {
        if (name === 'background' && type === 'changes')
            this.changeSubscribers.forEach((callback) => callback(data));
    };

    subscribeToChanges(callback: (data: ExtensionData) => void) {
        this.changeSubscribers.add(callback);
        if (this.changeSubscribers.size === 1) {
            chrome.runtime.onMessage.addListener(this.onChangesReceived);
            if (isChromium)
                chrome.runtime.sendMessage({name: 'ui', type: 'subscribe-to-changes'});
        }
    }

    enable() {
        chrome.runtime.sendMessage({name: 'ui', type: 'enable'});
    }

    disable() {
        chrome.runtime.sendMessage({name: 'ui', type: 'disable'});
    }

    setShortcut(command: string, shortcut: string) {
        chrome.runtime.sendMessage({name: 'ui', type: 'set-shortcut', data: {command, shortcut}});
    }

    changeSettings(settings: Partial<UserSettings>) {
        chrome.runtime.sendMessage({name: 'ui', type: 'change-settings', data: settings});
    }

    setTheme(theme: Partial<FilterConfig>) {
        chrome.runtime.sendMessage({name: 'ui', type: 'set-theme', data: theme});
    }

    toggleURL(url: string) {
        chrome.runtime.sendMessage({name: 'ui', type: 'toggle-url', data: url});
    }

    markNewsAsRead(ids: string[]) {
        chrome.runtime.sendMessage({name: 'ui', type: 'mark-news-as-read', data: ids});
    }

    loadConfig(options: {local: boolean}) {
        chrome.runtime.sendMessage({name: 'ui', type: 'load-config', data: options});
    }

    async applyDevDynamicThemeFixes(text: string) {
        return await this.sendRequest<void>({type: 'apply-dev-dynamic-theme-fixes', data: text});
    }

    resetDevDynamicThemeFixes() {
        chrome.runtime.sendMessage({name: 'ui', type: 'reset-dev-dynamic-theme-fixes'});
    }

    async applyDevInversionFixes(text: string) {
        return await this.sendRequest<void>({type: 'apply-dev-inversion-fixes', data: text});
    }

    resetDevInversionFixes() {
        chrome.runtime.sendMessage({name: 'ui', type: 'reset-dev-inversion-fixes'});
    }

    async applyDevStaticThemes(text: string) {
        return await this.sendRequest<void>({type: 'apply-dev-static-themes', data: text});
    }

    resetDevStaticThemes() {
        chrome.runtime.sendMessage({name: 'ui', type: 'reset-dev-static-themes'});
    }

    disconnect() {
        if (this.changeSubscribers.size > 0) {
            this.changeSubscribers.clear();
            chrome.runtime.onMessage.removeListener(this.onChangesReceived);
            if (isChromium)
                chrome.runtime.sendMessage({name: 'ui', type: 'unsubscribe-from-changes'});
        }
    }
}
