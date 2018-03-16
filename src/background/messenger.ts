import {ExtensionData, ExtensionActions, FilterConfig, TabInfo} from '../definitions';

interface ExtensionAdapter {
    collect: () => Promise<ExtensionData>;
    getActiveTabInfo: () => Promise<TabInfo>;
    enable: () => void;
    disable: () => void;
    setConfig: (config: FilterConfig) => void;
    toggleSitePattern: (pattern: string) => void;
    applyDevInversionFixes: (json: string) => Error;
    resetDevInversionFixes: () => void;
}

export default class Messenger {
    private reporters: Set<(info: ExtensionData) => void>;

    constructor(adapter: ExtensionAdapter) {
        this.reporters = new Set();
        chrome.runtime.onConnect.addListener((port) => {
            port.onMessage.addListener(async ({type, id, data}) => {
                switch (type) {
                    case 'getData': {
                        const data = await adapter.collect();
                        port.postMessage({id, data});
                        break;
                    }
                    case 'getActiveTabInfo': {
                        const data = await adapter.getActiveTabInfo();
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
                    case 'toggleSitePattern': {
                        adapter.toggleSitePattern(data);
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
