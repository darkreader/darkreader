import {ExtensionData, ExtensionActions, FilterConfig} from '../../definitions';

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

    getData() {
        const id = this.getRequestId();
        return new Promise<ExtensionData>((resolve) => {
            const listener = ({id: responseId, data}) => {
                if (responseId === id) {
                    resolve(data);
                    this.port.onMessage.removeListener(listener);
                }
            };
            this.port.onMessage.addListener(listener);
            this.port.postMessage({type: 'getData', id});
        });
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

    toggleCurrentSite() {
        this.port.postMessage({type: 'toggleCurrentSite'});
    }

    applyDevInversionFixes(json: string) {
        const id = this.getRequestId();
        return new Promise<void>((resolve, reject) => {
            const listener = ({id: responseId, error}) => {
                if (responseId === id) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                    this.port.onMessage.removeListener(listener);
                }
            };
            this.port.onMessage.addListener(listener);
            this.port.postMessage({type: 'applyDevInversionFixes', data: json, id});
        });
    }

    resetDevInversionFixes() {
        this.port.postMessage({type: 'resetDevInversionFixes'});
    }

    disconnect() {
        this.port.disconnect();
    }
}
