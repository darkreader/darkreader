import {ExtensionInfo, FilterConfig} from '../../definitions';

export default class Connector {
    private port: chrome.runtime.Port;
    private counter: number;

    constructor() {
        this.counter = 0;
        this.port = chrome.runtime.connect();
    }

    private getRequestId() {
        return String(++this.counter);
    }

    getInfo() {
        const id = this.getRequestId();
        return new Promise<ExtensionInfo>((resolve) => {
            const listener = ({id: responseId, data}) => {
                if (responseId === id) {
                    resolve(data);
                    this.port.onMessage.removeListener(listener);
                }
            };
            this.port.onMessage.addListener(listener);
            this.port.postMessage({type: 'getInfo', id});
        });
    }

    subscribeToChanges(callback: (info: ExtensionInfo) => void) {
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

    destroy() {
        this.port.disconnect();
    }
}
