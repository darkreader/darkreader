import type {ExtensionData, ExtensionActions, FilterConfig, TabInfo, Message, UserSettings} from '../../definitions';

export default class Connector implements ExtensionActions {
    private changeSubscribers: Set<(data: ExtensionData) => void>;

    constructor() {
        this.changeSubscribers = new Set();
    }

    private async sendRequest<T>(request: Message, executor: (response: Message, resolve: (data?: T) => void, reject: (error: Error) => void) => void) {
        return new Promise<T>((resolve, reject) => {
            chrome.runtime.sendMessage({name: 'ui', ...request}, (response) => {
                executor(response, resolve, reject);
            });
        });
    }

    async getData() {
        return await this.sendRequest<ExtensionData>({type: 'get-data'}, ({data}, resolve) => resolve(data));
    }

    async getActiveTabInfo() {
        return await this.sendRequest<TabInfo>({type: 'get-active-tab-info'}, ({data}, resolve) => resolve(data));
    }

    private onChangesReceived = ({name, type, data}: Message) => {
        if (name === 'background' && type === 'changes')
            this.changeSubscribers.forEach(callback => callback(data))
    };

    subscribeToChanges(callback: (data: ExtensionData) => void) {
        this.changeSubscribers.add(callback);
        if (this.changeSubscribers.size === 1) {
            chrome.runtime.onMessage.addListener(this.onChangesReceived);
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
        return await this.sendRequest<void>({type: 'apply-dev-dynamic-theme-fixes', data: text}, ({error}, resolve, reject) => error ? reject(error) : resolve());
    }

    resetDevDynamicThemeFixes() {
        chrome.runtime.sendMessage({name: 'ui', type: 'reset-dev-dynamic-theme-fixes'});
    }

    async applyDevInversionFixes(text: string) {
        return await this.sendRequest<void>({type: 'apply-dev-inversion-fixes', data: text}, ({error}, resolve, reject) => error ? reject(error) : resolve());
    }

    resetDevInversionFixes() {
        chrome.runtime.sendMessage({name: 'ui', type: 'reset-dev-inversion-fixes'});
    }

    async applyDevStaticThemes(text: string) {
        return await this.sendRequest<void>({type: 'apply-dev-static-themes', data: text}, ({error}, resolve, reject) => error ? reject(error) : resolve());
    }

    resetDevStaticThemes() {
        chrome.runtime.sendMessage({name: 'ui', type: 'reset-dev-static-themes'});
    }

    disconnect() {
        if (this.changeSubscribers.size > 0) {
            this.changeSubscribers = new Set();
            chrome.runtime.onMessage.removeListener(this.onChangesReceived);
            chrome.runtime.sendMessage({name: 'ui', type: 'unsubscribe-from-changes'});
        }
    }
}
