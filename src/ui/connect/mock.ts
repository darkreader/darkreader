import {ExtensionData, TabInfo, UserSettings} from '../../definitions';

export function getMockData(override = {}): ExtensionData {
    return Object.assign({
        isEnabled: true,
        isReady: true,
        settings: {
            enabled: true,
            theme: {
                mode: 1,
                brightness: 110,
                contrast: 90,
                grayscale: 20,
                sepia: 10,
                useFont: false,
                fontFamily: 'Segoe UI',
                textStroke: 0,
                engine: 'cssFilter',
                stylesheet: '',
            },
            customThemes: [],
            siteList: [],
            applyToListedOnly: false,
            changeBrowserTheme: false,
            notifyOfNews: false,
            syncSettings: true,
            automation: '',
            time: {
                activation: '18:00',
                deactivation: '9:00',
            },
        } as UserSettings,
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
        url: 'https://darkreader.org/',
        isProtected: false,
        isInDarkList: false,
        isSupported: true,
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
        changeSettings(settings) {
            Object.assign(data.settings, settings);
            listener(data);
        },
        setTheme(theme) {
            Object.assign(data.settings.theme, theme);
            listener(data);
        },
        setShortcut(command, shortcut) {
            Object.assign(data.shortcuts, {[command]: shortcut});
            listener(data);
        },
        toggleSitePattern(pattern) {
            const index = data.settings.siteList.indexOf(pattern);
            if (index >= 0) {
                data.settings.siteList.splice(pattern, 1);
            } else {
                data.settings.siteList.push(pattern);
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
