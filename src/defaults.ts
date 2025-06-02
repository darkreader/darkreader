import {extendThemeDefaults} from '@plus/defaults';
import type {Theme, UserSettings} from './definitions';
import {ThemeEngine} from './generators/theme-engines';
import {AutomationMode} from './utils/automation';
import type {ParsedColorSchemeConfig} from './utils/colorscheme-parser';
import {isMacOS, isWindows, isCSSColorSchemePropSupported, isEdge, isMobile} from './utils/platform';

declare const __CHROMIUM_MV3__: boolean;
declare const __PLUS__: boolean;

export const DEFAULT_COLORS = {
    darkScheme: {
        background: '#181a1b',
        text: '#e8e6e3',
    },
    lightScheme: {
        background: '#dcdad7',
        text: '#181a1b',
    },
};

export const DEFAULT_THEME: Theme = {
    mode: 1,
    brightness: 100,
    contrast: 100,
    grayscale: 0,
    sepia: 0,
    useFont: false,
    fontFamily: isMacOS ? 'Helvetica Neue' : isWindows ? 'Segoe UI' : 'Open Sans',
    textStroke: 0,
    engine: ThemeEngine.dynamicTheme,
    stylesheet: '',
    darkSchemeBackgroundColor: DEFAULT_COLORS.darkScheme.background,
    darkSchemeTextColor: DEFAULT_COLORS.darkScheme.text,
    lightSchemeBackgroundColor: DEFAULT_COLORS.lightScheme.background,
    lightSchemeTextColor: DEFAULT_COLORS.lightScheme.text,
    scrollbarColor: '',
    selectionColor: 'auto',
    styleSystemControls: __CHROMIUM_MV3__ ? false : !isCSSColorSchemePropSupported,
    lightColorScheme: 'Default',
    darkColorScheme: 'Default',
    immediateModify: false,
};

if (__PLUS__) {
    extendThemeDefaults(DEFAULT_THEME);
}

export const DEFAULT_COLORSCHEME: ParsedColorSchemeConfig = {
    light: {
        Default: {
            backgroundColor: DEFAULT_COLORS.lightScheme.background,
            textColor: DEFAULT_COLORS.lightScheme.text,
        },
    },
    dark: {
        Default: {
            backgroundColor: DEFAULT_COLORS.darkScheme.background,
            textColor: DEFAULT_COLORS.darkScheme.text,
        },
    },
};

const filterModeSites = [
    '*.officeapps.live.com',
    '*.sharepoint.com',
    'docs.google.com',
    'onedrive.live.com',
];

export const DEFAULT_SETTINGS: UserSettings = {
    schemeVersion: 0,
    enabled: true,
    fetchNews: true,
    theme: DEFAULT_THEME,
    presets: [],
    customThemes: filterModeSites.map((url) => {
        const engine: ThemeEngine = ThemeEngine.cssFilter;
        return {
            url: [url],
            theme: {...DEFAULT_THEME, engine},
            builtIn: true,
        };
    }),
    enabledByDefault: true,
    enabledFor: [],
    disabledFor: [],
    changeBrowserTheme: false,
    syncSettings: true,
    syncSitesFixes: false,
    automation: {
        enabled: isEdge && isMobile ? true : false,
        mode: isEdge && isMobile ? AutomationMode.SYSTEM : AutomationMode.NONE,
        behavior: 'OnOff',
    },
    time: {
        activation: '18:00',
        deactivation: '9:00',
    },
    location: {
        latitude: null,
        longitude: null,
    },
    previewNewDesign: false,
    previewNewestDesign: false,
    enableForPDF: true,
    enableForProtectedPages: false,
    enableContextMenus: false,
    detectDarkTheme: true,
};
