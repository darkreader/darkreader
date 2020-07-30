import {ExtensionData, ExtensionActions, FilterConfig, TabInfo, Message, UserSettings} from '../../definitions';

export default class Connector implements ExtensionActions {
    private port: chrome.runtime.Port;
    private counter: number;

    constructor() {
        this.counter = 0;
        this.port = chrome.runtime.connect({name: 'ui'});
    }

    private getRequestId() {
        return ++this.counter;
    }

    private sendRequest<T>(request: Message, executor: (response: Message, resolve: (data?: T) => void, reject: (error: Error) => void) => void) {
        const id = this.getRequestId();
        return new Promise<T>((resolve, reject) => {
            const listener = ({id: responseId, ...response}: Message) => {
                if (responseId === id) {
                    executor(response, resolve, reject);
                    this.port.onMessage.removeListener(listener);
                }
            };
            this.port.onMessage.addListener(listener);
            this.port.postMessage({...request, id});
        });
    }

    getData() {
        return this.sendRequest<ExtensionData>({type: 'get-data'}, ({data}, resolve) => resolve(data));
    }

    getActiveTabInfo() {
        return this.sendRequest<TabInfo>({type: 'get-active-tab-info'}, ({data}, resolve) => resolve(data));
    }

    subscribeToChanges(callback: (data: ExtensionData) => void) {
        const id = this.getRequestId();
        this.port.onMessage.addListener(({id: responseId, data}: Message) => {
            if (responseId === id) {
                callback(data);
            }
        });
        this.port.postMessage({type: 'subscribe-to-changes', id});
    }

    enable() {
        this.port.postMessage({type: 'enable'});
    }

    disable() {
        this.port.postMessage({type: 'disable'});
    }

    setShortcut(command: string, shortcut: string) {
        this.port.postMessage({type: 'set-shortcut', data: {command, shortcut}});
    }

    changeSettings(settings: Partial<UserSettings>) {
        this.port.postMessage({type: 'change-settings', data: settings});
    }

    setTheme(theme: Partial<FilterConfig>) {
        this.port.postMessage({type: 'set-theme', data: theme});
    }

    toggleURL(url: string) {
        this.port.postMessage({type: 'toggle-url', data: url});
    }

    markNewsAsRead(ids: string[]) {
        this.port.postMessage({type: 'mark-news-as-read', data: ids});
    }

    loadConfig(options: {local: boolean}) {
        this.port.postMessage({type: 'load-config', data: options});
    }

    applyDevDynamicThemeFixes(text: string) {
        return this.sendRequest<void>({type: 'apply-dev-dynamic-theme-fixes', data: text}, ({error}, resolve, reject) => error ? reject(error) : resolve());
    }

    resetDevDynamicThemeFixes() {
        this.port.postMessage({type: 'reset-dev-dynamic-theme-fixes'});
    }

    applyDevInversionFixes(text: string) {
        return this.sendRequest<void>({type: 'apply-dev-inversion-fixes', data: text}, ({error}, resolve, reject) => error ? reject(error) : resolve());
    }

    resetDevInversionFixes() {
        this.port.postMessage({type: 'reset-dev-inversion-fixes'});
    }

    applyDevStaticThemes(text: string) {
        return this.sendRequest<void>({type: 'apply-dev-static-themes', data: text}, ({error}, resolve, reject) => error ? reject(error) : resolve());
    }

    resetDevStaticThemes() {
        this.port.postMessage({type: 'reset-dev-static-themes'});
    }

    disconnect() {
        this.port.disconnect();
    }
}
