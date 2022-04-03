import type {ExtensionData, Theme, UserSettings} from '../../definitions';

export function getMockData(override = {} as Partial<ExtensionData>): ExtensionData {
    return Object.assign({
        isEnabled: true,
        isReady: true,
        settings: {
            enabled: true,
            fetchNews: true,
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
            syncSettings: true,
            automation: '',
            automationBehaviour: 'OnOff',
            previewNewDesign: false,
            time: {
                activation: '18:00',
                deactivation: '9:00',
            },
            location: {
                latitude: 52.4237178,
                longitude: 31.021786,
            },
            detectDarkTheme: false,
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
        colorScheme: {
            dark: {
                Default: {
                    backgroundColor: '#1e1e1e',
                    textColor: '#d4d4d4',
                },
            },
            light: {
                Default: {
                    backgroundColor: '#ffffff',
                    textColor: '#000000',
                },
            },
        },
        forcedScheme: null,
        activeTab: {
            url: 'https://darkreader.org/',
            isProtected: false,
            isInDarkList: false,
            isInjected: true,
            isDarkThemeDetected: false,
        },
    } as ExtensionData, override);
}
