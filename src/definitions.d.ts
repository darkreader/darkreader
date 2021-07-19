import type {FilterMode} from './generators/css-filter';

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
    markNewsAsRead(ids: string[]);
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
    from: string;
    data: any;
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
    neutralBg?: string[];
    neutralBgActive?: string[];
    neutralText?: string[];
    neutralTextActive?: string[];
    neutralBorder?: string[];
    redBg?: string[];
    redBgActive?: string[];
    redText?: string[];
    redTextActive?: string[];
    redBorder?: string[];
    greenBg?: string[];
    greenBgActive?: string[];
    greenText?: string[];
    greenTextActive?: string[];
    greenBorder?: string[];
    blueBg?: string[];
    blueBgActive?: string[];
    blueText?: string[];
    blueTextActive?: string[];
    blueBorder?: string[];
    fadeBg?: string[];
    fadeText?: string[];
    transparentBg?: string[];
    noImage?: string[];
    invert?: string[];
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
