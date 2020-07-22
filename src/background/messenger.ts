import {ExtensionData, FilterConfig, TabInfo, Message, UserSettings} from '../definitions';

export interface ExtensionAdapter {
    collect: () => Promise<ExtensionData>;
    getActiveTabInfo: () => Promise<TabInfo>;
    changeSettings: (settings: Partial<UserSettings>) => void;
    setTheme: (theme: Partial<FilterConfig>) => void;
    setShortcut: ({command, shortcut}) => void;
    markNewsAsRead: (ids: string[]) => void;
    toggleURL: (pattern: string) => void;
    onPopupOpen: () => void;
    loadConfig: (options: {local: boolean}) => Promise<void>;
    applyDevDynamicThemeFixes: (json: string) => Error;
    resetDevDynamicThemeFixes: () => void;
    applyDevInversionFixes: (json: string) => Error;
    resetDevInversionFixes: () => void;
    applyDevStaticThemes: (text: string) => Error;
    resetDevStaticThemes: () => void;
}

export default class Messenger {
    private reporters: Set<(info: ExtensionData) => void>;
    private adapter: ExtensionAdapter;

    constructor(adapter: ExtensionAdapter) {
        this.reporters = new Set();
        this.adapter = adapter;
        chrome.runtime.onConnect.addListener((port) => {
            if (port.name === 'ui') {
                port.onMessage.addListener((message) => this.onUIMessage(port, message));
                this.adapter.onPopupOpen();
            }
        });
    }

    private async onUIMessage(port: chrome.runtime.Port, {type, id, data}: Message) {
        switch (type) {
            case 'get-data': {
                const data = await this.adapter.collect();
                port.postMessage({id, data});
                break;
            }
            case 'get-active-tab-info': {
                const data = await this.adapter.getActiveTabInfo();
                port.postMessage({id, data});
                break;
            }
            case 'subscribe-to-changes': {
                const report = (data) => port.postMessage({id, data});
                this.reporters.add(report);
                port.onDisconnect.addListener(() => this.reporters.delete(report));
                break;
            }
            case 'change-settings': {
                this.adapter.changeSettings(data);
                break;
            }
            case 'set-theme': {
                this.adapter.setTheme(data);
                break;
            }
            case 'set-shortcut': {
                this.adapter.setShortcut(data);
                break;
            }
            case 'toggle-url': {
                this.adapter.toggleURL(data);
                break;
            }
            case 'mark-news-as-read': {
                this.adapter.markNewsAsRead(data);
                break;
            }
            case 'load-config': {
                await this.adapter.loadConfig(data);
            }
            case 'apply-dev-dynamic-theme-fixes': {
                const error = this.adapter.applyDevDynamicThemeFixes(data);
                port.postMessage({id, error: (error ? error.message : null)});
                break;
            }
            case 'reset-dev-dynamic-theme-fixes': {
                this.adapter.resetDevDynamicThemeFixes();
                break;
            }
            case 'apply-dev-inversion-fixes': {
                const error = this.adapter.applyDevInversionFixes(data);
                port.postMessage({id, error: (error ? error.message : null)});
                break;
            }
            case 'reset-dev-inversion-fixes': {
                this.adapter.resetDevInversionFixes();
                break;
            }
            case 'apply-dev-static-themes': {
                const error = this.adapter.applyDevStaticThemes(data);
                port.postMessage({id, error: error ? error.message : null});
                break;
            }
            case 'reset-dev-static-themes': {
                this.adapter.resetDevStaticThemes();
                break;
            }
        }
    }

    reportChanges(data: ExtensionData) {
        this.reporters.forEach((report) => report(data));
    }
}
