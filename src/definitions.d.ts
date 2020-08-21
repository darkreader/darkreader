import {FilterMode} from './generators/css-filter';

export interface ExtensionData {
    isEnabled: boolean;
    isReady: boolean;
    settings: UserSettings;
    fonts: string[];
    news: News[];
    shortcuts: Shortcuts;
    devtools: {
        dynamicFixesText: string;
        filterFixesText: string;
        hasCustomDynamicFixes: boolean;
        hasCustomFilterFixes: boolean;
    };
}

export interface ExtensionActions {
    changeSettings(settings: Partial<UserSettings>);
    setTheme(theme: Partial<FilterConfig>);
    setShortcut(command: string, shortcut: string);
    toggleURL(url: string);
    markNewsAsRead(ids: string[]);
    loadConfig(options: {local: boolean});
    applyDevDynamicThemeFixes(text: string): Promise<void>;
    resetDevDynamicThemeFixes();
    applyDevInversionFixes(text: string): Promise<void>;
    resetDevInversionFixes();
    applyDevStaticTheme(text: string, url: string): Promise<void>;
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
}

export type FilterConfig = Theme;

export interface CustomSiteConfig {
    url: string[];
    theme: FilterConfig;
}

export interface ThemePreset {
    id: string;
    name: string;
    urls: string[];
    theme: Theme;
}

export interface UserSettings {
    enabled: boolean;
    theme: FilterConfig;
    presets: ThemePreset[];
    customThemes: CustomSiteConfig[];
    siteList: string[];
    siteListEnabled: string[];
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
    url: string[];
    invert: string[];
    css: string;
    ignoreInlineStyle: string[];
    ignoreImageAnalysis: string[];
}

export interface InversionFix {
    url: string[];
    invert: string[];
    noinvert: string[];
    removebg: string[];
    css: string;
}

export interface StaticTheme {
    url: string[];
    css: string;
}

export interface News {
    id: string;
    date: string;
    url: string;
    headline: string;
    important: boolean;
    read?: boolean;
}
