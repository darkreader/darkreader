import {getURLHostOrProtocol} from '../../utils/url';
import type {ExtensionData, TabInfo, Theme, UserSettings} from '../../definitions';

export function getMockData(override = {} as Partial<ExtensionData>): ExtensionData {
    return Object.assign({
        isEnabled: true,
        isReady: true,
        settings: {
            enabled: true,
            presets: [],
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
                scrollbarColor: 'auto',
                styleSystemControls: true,
            } as Theme,
            customThemes: [],
            siteList: [],
            siteListEnabled: [],
            applyToListedOnly: false,
            changeBrowserTheme: false,
            enableForPDF: true,
            enableForProtectedPages: false,
            notifyOfNews: false,
            syncSettings: true,
            automation: '',
            time: {
                activation: '18:00',
                deactivation: '9:00',
            },
            location: {
                latitude: 52.4237178,
                longitude: 31.021786,
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
        devtools: {
            dynamicFixesText: '',
            filterFixesText: '',
            staticThemesText: '',
            hasCustomDynamicFixes: false,
            hasCustomFilterFixes: false,
            hasCustomStaticFixes: false,
        },
    } as ExtensionData, override);
}

export function getMockActiveTabInfo(): TabInfo {
    return {
        url: 'https://darkreader.org/',
        isProtected: false,
        isInDarkList: false,
    };
}

export function createConnectorMock() {
    let listener: (data) => void = null;
    const data = getMockData();
    const tab = getMockActiveTabInfo();
    const connector = {
        async getData() {
            return Promise.resolve(data);
        },
        async getActiveTabInfo() {
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
        toggleURL(url) {
            const pattern = getURLHostOrProtocol(url);
            const index = data.settings.siteList.indexOf(pattern);
            if (index >= 0) {
                data.settings.siteList.splice(index, 1, pattern);
            } else {
                data.settings.siteList.push(pattern);
            }
            listener(data);
        },
        markNewsAsRead(ids: string[]) {
            data.news
                .filter(({id}) => ids.includes(id))
                .forEach((news) => news.read = true);
            listener(data);
        },
        disconnect() {
            //
        },
    };
    return connector;
}
