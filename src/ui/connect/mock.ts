import {ExtensionData, TabInfo} from '../../definitions';

export function getMockData(override = {}): ExtensionData {
    return Object.assign({
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
            engine: 'cssFilter',
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
        news: [],
        shortcuts: {
            'addSite': 'Alt+Shift+A',
            'toggle': 'Alt+Shift+D'
        },
        devDynamicThemeFixesText: '',
        devInversionFixesText: '',
        devStaticThemesText: '',
    }, override);
}

export function getMockActiveTabInfo(): TabInfo {
    return {
        url: 'http://darkreader.org/',
        isProtected: false,
        isInDarkList: false,
    };
}

export function createConnectorMock() {
    let listener: (data) => void = null;
    const data = getMockData();
    const tab = getMockActiveTabInfo();
    const connector = {
        getData() {
            return Promise.resolve(data);
        },
        getActiveTabInfo() {
            return Promise.resolve(tab);
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
        setShortcut(command, shortcut) {
            Object.assign(data.shortcuts, {[command]: shortcut});
            listener(data);
        },
        toggleSitePattern(pattern) {
            const index = data.filterConfig.siteList.indexOf(pattern);
            if (index >= 0) {
                data.filterConfig.siteList.splice(pattern, 1);
            } else {
                data.filterConfig.siteList.push(pattern);
            }
            listener(data);
        },
        markNewsAsRead(ids) {
            //
        },
        disconnect() {
            //
        },
    };
    return connector;
}
