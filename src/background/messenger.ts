import {ExtensionData, ExtensionActions, FilterConfig} from '../definitions';

interface ExtensionAdapter {
    collect: () => ExtensionData;
    enable: () => void;
    disable: () => void;
    setConfig: (config: FilterConfig) => void;
    toggleCurrentSite: () => void;
    applyDevInversionFixes: (json: string) => Error;
    resetDevInversionFixes: () => void;
}

export default class Messenger {
    private reporters: Set<(info: ExtensionData) => void>;

    constructor(adapter: ExtensionAdapter) {
        this.reporters = new Set();
        chrome.runtime.onConnect.addListener((port) => {
            port.onMessage.addListener(({type, id, data}) => {
                switch (type) {
                    case 'getData': {
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
                    case 'applyDevInversionFixes': {
                        const error = adapter.applyDevInversionFixes(data);
                        port.postMessage({id, error: error ? error.message : null});
                        break;
                    }
                    case 'resetDevInversionFixes': {
                        adapter.resetDevInversionFixes();
                        break;
                    }
                }
            });
        });
    }

    reportChanges(data: ExtensionData) {
        this.reporters.forEach((report) => report(data));
    }
}
