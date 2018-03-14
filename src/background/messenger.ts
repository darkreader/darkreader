import {ExtensionInfo, FilterConfig} from '../definitions';

interface ExtensionAdapter {
    collect: () => ExtensionInfo;
    enable: () => void;
    disable: () => void;
    setConfig: (config: FilterConfig) => void;
    toggleCurrentSite: () => void;
}

export default class Messenger {
    private reporters: Set<(info: ExtensionInfo) => void>;

    constructor(adapter: ExtensionAdapter) {
        this.reporters = new Set();
        chrome.runtime.onConnect.addListener((port) => {
            port.onMessage.addListener(({type, id, data}) => {
                switch (type) {
                    case 'getInfo': {
                        const data = adapter.collect();
                        port.postMessage({id, data});
                        break;
                    }
                    case 'subscribeToChanges': {
                        const report = (data) => port.postMessage({id, data});
                        this.reporters.add(report);
                        port.onDisconnect.addListener(() => this.reporters.delete(report));
                        break;
                    }
                    case 'enable': {
                        adapter.enable();
                        break;
                    }
                    case 'disable': {
                        adapter.disable();
                        break;
                    }
                    case 'setConfig': {
                        adapter.setConfig(data);
                        break;
                    }
                    case 'toggleCurrentSite': {
                        adapter.toggleCurrentSite();
                        break;
                    }
                }
            });
        });
    }

    reportChanges(info: ExtensionInfo) {
        this.reporters.forEach((report) => report(info));
    }
}
