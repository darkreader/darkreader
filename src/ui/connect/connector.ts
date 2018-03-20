import {ExtensionData, ExtensionActions, FilterConfig, TabInfo} from '../../definitions';

export default class Connector implements ExtensionActions {
    private port: chrome.runtime.Port;
    private counter: number;

    constructor() {
        this.counter = 0;
        this.port = chrome.runtime.connect();
    }

    private getRequestId() {
        return String(++this.counter);
    }

    private sendRequest<T>(request, executor: (response, resolve: (data?: T) => void, reject: (error: Error) => void) => void) {
        const id = this.getRequestId();
        return new Promise<T>((resolve, reject) => {
            const listener = ({id: responseId, ...response}) => {
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
        return this.sendRequest<ExtensionData>({type: 'getData'}, ({data}, resolve) => resolve(data));
    }

    getActiveTabInfo() {
        return this.sendRequest<TabInfo>({type: 'getActiveTabInfo'}, ({data}, resolve) => resolve(data));
    }

    subscribeToChanges(callback: (data: ExtensionData) => void) {
        const id = this.getRequestId();
        this.port.onMessage.addListener(({id: responseId, data}) => {
            if (responseId === id) {
                callback(data);
            }
        });
        this.port.postMessage({type: 'subscribeToChanges', id});
    }

    enable() {
        this.port.postMessage({type: 'enable'});
    }

    disable() {
        this.port.postMessage({type: 'disable'});
    }

    setConfig(config: FilterConfig) {
        this.port.postMessage({type: 'setConfig', data: config});
    }

    toggleSitePattern(pattern: string) {
        this.port.postMessage({type: 'toggleSitePattern', data: pattern});
    }

    applyDevInversionFixes(json: string) {
        return this.sendRequest<void>({type: 'applyDevInversionFixes', data: json}, ({error}, resolve, reject) => error ? reject(error) : resolve());
    }

    resetDevInversionFixes() {
        this.port.postMessage({type: 'resetDevInversionFixes'});
    }

    applyDevStaticThemes(text: string) {
        return this.sendRequest<void>({type: 'applyDevStaticThemes', data: text}, ({error}, resolve, reject) => error ? reject(error) : resolve());
    }

    resetDevStaticThemes() {
        this.port.postMessage({type: 'resetDevStaticThemes'});
    }

    disconnect() {
        this.port.disconnect();
    }
}
