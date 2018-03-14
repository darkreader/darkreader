import {ExtensionData} from '../../definitions';

export function getMockData(): ExtensionData {
    return {
        enabled: true,
        ready: true,
        filterConfig: {
            mode: 1,
            brightness: 110,
            contrast: 90,
            grayscale: 20,
            sepia: 10,
            useFont: false,
            fontFamily: 'Segoe UI',
            textStroke: 0,
            invertListed: false,
            siteList: []
        },
        fonts: [
            'serif',
            'sans-serif',
            'monospace',
            'cursive',
            'fantasy',
            'system-ui'
        ],
        activeTab: {
            url: 'http://darkreader.org/',
            host: 'darkreader.org',
            isProtected: false,
            isInDarkList: false,
        },
        devInversionFixesText: `${JSON.stringify({common: {invert: 'img, iframe'}, sites: [{url: 'google.*', invert: '.icon'}]}, null, 4)}\n`
    };
}

export function createConnectorMock() {
    let listener: (data) => void = null;
    const data = getMockData();
    const connector = {
        getData() {
            return Promise.resolve(data);
        },
        subscribeToChanges(callback) {
            listener = callback;
        },
        enable() {
            data.enabled = true;
            listener(data);
        },
        disable() {
            data.enabled = false;
            listener(data);
        },
        setConfig(config) {
            Object.assign(data.filterConfig, config);
            listener(data);
        },
        toggleCurrentSite() {
            const index = data.filterConfig.siteList.indexOf(data.activeTab.host);
            if (index >= 0) {
                data.filterConfig.siteList.splice(index, 1);
            } else {
                data.filterConfig.siteList.push(data.activeTab.host);
            }
            listener(data);
        },
        disconnect() {
            //
        },
    };
    return connector;
}
