import {isFirefox} from '../utils/platform';
import type {ExtensionData, FilterConfig, TabInfo, Message, UserSettings} from '../definitions';

export interface ExtensionAdapter {
    collect: () => Promise<ExtensionData>;
    getActiveTabInfo: () => Promise<TabInfo>;
    changeSettings: (settings: Partial<UserSettings>) => void;
    setTheme: (theme: Partial<FilterConfig>) => void;
    setShortcut: ({command, shortcut}) => void;
    markNewsAsRead: (ids: string[]) => Promise<void>;
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
    private adapter: ExtensionAdapter;
    private changeListenerCount: number;

    constructor(adapter: ExtensionAdapter) {
        this.adapter = adapter;
        this.changeListenerCount = 0;
        chrome.runtime.onMessage.addListener((message: Message, _: any, sendResponse: (response: any) => void) => {
            if (message.from === 'ui') {
                this.onUIMessage(message, sendResponse);
                this.adapter.onPopupOpen();
                return ([
                    'get-data',
                    'get-active-tab-info'
                ].includes(message.type));
            }
        });

        // This is a work-around for Firefox bug which does not let to responding to onMessage handler above.
        if (isFirefox) {
            chrome.runtime.onConnect.addListener((port) => {
                let promise: Promise<ExtensionData | TabInfo>;
                switch (port.name) {
                    case 'ui-get-data':
                        promise = this.adapter.collect();
                        break;
                    case 'ui-get-active-tab-info':
                        promise = this.adapter.getActiveTabInfo();
                        break;
                    default:
                        return;
                }
                promise.then((data) => port.postMessage({data}))
                    .catch((error) => port.postMessage({error}));
            });
        }
    }

    private onUIMessage({type, data}: Message, sendResponse: (response: any) => void) {
        switch (type) {
            case 'get-data': {
                this.adapter.collect().then((data) => sendResponse({data}));
                break;
            }
            case 'get-active-tab-info': {
                this.adapter.getActiveTabInfo().then((data) => sendResponse({data}));
                break;
            }
            case 'subscribe-to-changes': {
                this.changeListenerCount++;
                break;
            }
            case 'unsubscribe-from-changes': {
                this.changeListenerCount--;
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
                this.adapter.loadConfig(data);
                break;
            }
            case 'apply-dev-dynamic-theme-fixes': {
                const error = this.adapter.applyDevDynamicThemeFixes(data);
                sendResponse({error: (error ? error.message : null)});
                break;
            }
            case 'reset-dev-dynamic-theme-fixes': {
                this.adapter.resetDevDynamicThemeFixes();
                break;
            }
            case 'apply-dev-inversion-fixes': {
                const error = this.adapter.applyDevInversionFixes(data);
                sendResponse({error: (error ? error.message : null)});
                break;
            }
            case 'reset-dev-inversion-fixes': {
                this.adapter.resetDevInversionFixes();
                break;
            }
            case 'apply-dev-static-themes': {
                const error = this.adapter.applyDevStaticThemes(data);
                sendResponse({error: error ? error.message : null});
                break;
            }
            case 'reset-dev-static-themes': {
                this.adapter.resetDevStaticThemes();
                break;
            }
        }
    }

    reportChanges(data: ExtensionData) {
        if (this.changeListenerCount > 0 || isFirefox) {
            const message: Message = {
                from: 'background',
                type: 'changes',
                data
            };
            chrome.runtime.sendMessage(message);
        }
    }
}
