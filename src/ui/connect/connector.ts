import {isFirefox} from 'utils/platform';
import type {ExtensionData, ExtensionActions, FilterConfig, TabInfo, Message, UserSettings} from '../../definitions';

export default class Connector implements ExtensionActions {
    private changeSubscribers: Set<(data: ExtensionData) => void>;

    constructor() {
        this.changeSubscribers = new Set();
    }

    private async sendRequest<T>(type: string, data?: any) {
        return new Promise<T>((resolve, reject) => {
            chrome.runtime.sendMessage({from: 'ui', type, ...data}, ({data, error}) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    private async firefoxSendRequestWithResponse<T>(name: string) {
        return new Promise<T>((resolve, reject) => {
            const dataPort = chrome.runtime.connect({name});
            dataPort.onDisconnect.addListener(() => reject());
            dataPort.onMessage.addListener(({data, error}) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
                dataPort.disconnect();
            });
        });
    }

    async getData() {
        if (isFirefox) {
            return await this.firefoxSendRequestWithResponse<ExtensionData>('ui-get-data');
        }
        return await this.sendRequest<ExtensionData>('get-data');
    }

    async getActiveTabInfo() {
        if (isFirefox) {
            return await this.firefoxSendRequestWithResponse<TabInfo>('ui-get-active-tab-info');
        }
        return await this.sendRequest<TabInfo>('get-active-tab-info');
    }

    private onChangesReceived = ({from, type, data}: Message) => {
        if (from === 'background' && type === 'changes') {
            this.changeSubscribers.forEach((callback) => callback(data));
        }
    };

    private sendMessage(data: any) {
        chrome.runtime.sendMessage({from: 'ui', ...data});
    }

    subscribeToChanges(callback: (data: ExtensionData) => void) {
        this.changeSubscribers.add(callback);
        if (this.changeSubscribers.size === 1) {
            chrome.runtime.onMessage.addListener(this.onChangesReceived);
            if (!isFirefox) {
                this.sendMessage({type: 'subscribe-to-changes'});
            }
        }
    }

    enable() {
        this.sendMessage({type: 'enable'});
    }

    disable() {
        this.sendMessage({type: 'disable'});
    }

    setShortcut(command: string, shortcut: string) {
        this.sendMessage({type: 'set-shortcut', data: {command, shortcut}});
    }

    changeSettings(settings: Partial<UserSettings>) {
        this.sendMessage({type: 'change-settings', data: settings});
    }

    setTheme(theme: Partial<FilterConfig>) {
        this.sendMessage({type: 'set-theme', data: theme});
    }

    toggleURL(url: string) {
        this.sendMessage({type: 'toggle-url', data: url});
    }

    markNewsAsRead(ids: string[]) {
        this.sendMessage({type: 'mark-news-as-read', data: ids});
    }

    loadConfig(options: {local: boolean}) {
        this.sendMessage({type: 'load-config', data: options});
    }

    async applyDevDynamicThemeFixes(text: string) {
        return await this.sendRequest<void>('apply-dev-dynamic-theme-fixes', {data: text});
    }

    resetDevDynamicThemeFixes() {
        this.sendMessage({type: 'reset-dev-dynamic-theme-fixes'});
    }

    async applyDevInversionFixes(text: string) {
        return await this.sendRequest<void>('apply-dev-inversion-fixes', {data: text});
    }

    resetDevInversionFixes() {
        this.sendMessage({type: 'reset-dev-inversion-fixes'});
    }

    async applyDevStaticThemes(text: string) {
        return await this.sendRequest<void>('apply-dev-static-themes', {data: text});
    }

    resetDevStaticThemes() {
        this.sendMessage({type: 'reset-dev-static-themes'});
    }

    disconnect() {
        if (this.changeSubscribers.size > 0) {
            this.changeSubscribers.clear();
            chrome.runtime.onMessage.removeListener(this.onChangesReceived);
            if (!isFirefox) {
                this.sendMessage({type: 'unsubscribe-from-changes'});
            }
        }
    }
}
