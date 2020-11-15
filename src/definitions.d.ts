import type {FilterMode} from './generators/css-filter';

export interface ExtensionData {
    isEnabled: boolean;
    isReady: boolean;
    settings: UserSettings;
    fonts: Array<string>;
    news: Array<News>;
    shortcuts: Shortcuts;
    devtools: {
        dynamicFixesText: string;
        filterFixesText: string;
        staticThemesText: string;
        hasCustomDynamicFixes: boolean;
        hasCustomFilterFixes: boolean;
        hasCustomStaticFixes: boolean;
    };
}

export interface ExtensionActions {
    changeSettings(settings: Partial<UserSettings>);
    setTheme(theme: Partial<FilterConfig>);
    setShortcut(command: string, shortcut: string);
    toggleURL(url: string);
    markNewsAsRead(ids: Array<string>);
    loadConfig(options: {local: boolean});
    applyDevDynamicThemeFixes(text: string): Promise<void>;
    resetDevDynamicThemeFixes();
    applyDevInversionFixes(text: string): Promise<void>;
    resetDevInversionFixes();
    applyDevStaticThemes(text: string): Promise<void>;
    resetDevStaticThemes();
}

export interface ExtWrapper {
    data: ExtensionData;
    actions: ExtensionActions;
}

export interface Theme {
    mode: FilterMode;
    brightness: number;
    contrast: number;
    grayscale: number;
    sepia: number;
    useFont: boolean;
    fontFamily: string;
    textStroke: number;
    engine: string;
    stylesheet: string;
    darkSchemeBackgroundColor: string;
    darkSchemeTextColor: string;
    lightSchemeBackgroundColor: string;
    lightSchemeTextColor: string;
    scrollbarColor: '' | 'auto' | string;
    selectionColor: '' | 'auto' | string;
    styleSystemControls: boolean;
}

export type FilterConfig = Theme;

export interface CustomSiteConfig {
    url: Array<string>;
    theme: FilterConfig;
}

export interface ThemePreset {
    id: string;
    name: string;
    urls: Array<string>;
    theme: Theme;
}

export interface UserSettings {
    enabled: boolean;
    theme: FilterConfig;
    presets: Array<ThemePreset>;
    customThemes: Array<CustomSiteConfig>;
    siteList: Array<string>;
    siteListEnabled: Array<string>;
    applyToListedOnly: boolean;
    changeBrowserTheme: boolean;
    notifyOfNews: boolean;
    syncSettings: boolean;
    syncSitesFixes: boolean;
    automation: '' | 'time' | 'system' | 'location';
    time: TimeSettings;
    location: LocationSettings;
    previewNewDesign: boolean;
    enableForPDF: boolean;
    enableForProtectedPages: boolean;
}

export interface TimeSettings {
    activation: string;
    deactivation: string;
}

export interface LocationSettings {
    latitude: number;
    longitude: number;
}

export interface TabInfo {
    url: string;
    isProtected: boolean;
    isInDarkList: boolean;
}

export interface Message {
    type: string;
    data?: any;
    id?: any;
    error?: any;
}

export interface Shortcuts {
    [name: string]: string;
}

export interface DynamicThemeFix {
    url: Array<string>;
    invert: Array<string>;
    css: string;
    ignoreInlineStyle: Array<string>;
    ignoreImageAnalysis: Array<string>;
}

export interface InversionFix {
    url: Array<string>;
    invert: Array<string>;
    noinvert: Array<string>;
    removebg: Array<string>;
    css: string;
}

export interface StaticTheme {
    url: Array<string>;
    neutralBg?: Array<string>;
    neutralBgActive?: Array<string>;
    neutralText?: Array<string>;
    neutralTextActive?: Array<string>;
    neutralBorder?: Array<string>;
    redBg?: Array<string>;
    redBgActive?: Array<string>;
    redText?: Array<string>;
    redTextActive?: Array<string>;
    redBorder?: Array<string>;
    greenBg?: Array<string>;
    greenBgActive?: Array<string>;
    greenText?: Array<string>;
    greenTextActive?: Array<string>;
    greenBorder?: Array<string>;
    blueBg?: Array<string>;
    blueBgActive?: Array<string>;
    blueText?: Array<string>;
    blueTextActive?: Array<string>;
    blueBorder?: Array<string>;
    fadeBg?: Array<string>;
    fadeText?: Array<string>;
    transparentBg?: Array<string>;
    noImage?: Array<string>;
    invert?: Array<string>;
    noCommon?: boolean;
}

export interface News {
    id: string;
    date: string;
    url: string;
    headline: string;
    important: boolean;
    read?: boolean;
}
