import type {ParsedColorSchemeConfig} from './utils/colorscheme-parser';
import type {Theme, UserSettings} from './definitions';
import ThemeEngines from './generators/theme-engines';
import {isMacOS, isWindows, isCSSColorSchemePropSupported} from './utils/platform';

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
    engine: ThemeEngines.dynamicTheme,
    stylesheet: '',
    darkSchemeBackgroundColor: DEFAULT_COLORS.darkScheme.background,
    darkSchemeTextColor: DEFAULT_COLORS.darkScheme.text,
    lightSchemeBackgroundColor: DEFAULT_COLORS.lightScheme.background,
    lightSchemeTextColor: DEFAULT_COLORS.lightScheme.text,
    scrollbarColor: isMacOS ? '' : 'auto',
    selectionColor: 'auto',
    styleSystemControls: !isCSSColorSchemePropSupported,
    lightColorScheme: 'Default',
    darkColorScheme: 'Default',
    immediateModify: false,
};

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

export const DEFAULT_SETTINGS: UserSettings = {
    enabled: true,
    fetchNews: true,
    theme: DEFAULT_THEME,
    presets: [],
    customThemes: [],
    siteList: [],
    siteListEnabled: [],
    applyToListedOnly: false,
    changeBrowserTheme: false,
    syncSettings: true,
    syncSitesFixes: false,
    automation: '',
    automationBehaviour: 'OnOff',
    time: {
        activation: '18:00',
        deactivation: '9:00',
    },
    location: {
        latitude: null,
        longitude: null,
    },
    previewNewDesign: false,
    enableForPDF: true,
    enableForProtectedPages: false,
    enableContextMenus: false,
    detectDarkTheme: false,
};
