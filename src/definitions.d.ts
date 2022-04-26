import type {ParsedColorSchemeConfig} from './utils/colorscheme-parser';
import type {FilterMode} from './generators/css-filter';

export interface ExtensionData {
    isEnabled: boolean;
    isReady: boolean;
    settings: UserSettings;
    news: News[];
    shortcuts: Shortcuts;
    colorScheme: ParsedColorSchemeConfig;
    forcedScheme: 'dark' | 'light';
    devtools: {
        dynamicFixesText: string;
        filterFixesText: string;
        staticThemesText: string;
        hasCustomDynamicFixes: boolean;
        hasCustomFilterFixes: boolean;
        hasCustomStaticFixes: boolean;
    };
    activeTab: TabInfo;
}

export interface TabData {
    type: string;
    data?: any;
}

export interface ExtensionActions {
    changeSettings(settings: Partial<UserSettings>): void;
    setTheme(theme: Partial<FilterConfig>): void;
    setShortcut(command: string, shortcut: string): void;
    toggleActiveTab(): void;
    markNewsAsRead(ids: string[]): void;
    loadConfig(options: {local: boolean}): void;
    applyDevDynamicThemeFixes(text: string): Promise<void>;
    resetDevDynamicThemeFixes(): void;
    applyDevInversionFixes(text: string): Promise<void>;
    resetDevInversionFixes(): void;
    applyDevStaticThemes(text: string): Promise<void>;
    resetDevStaticThemes(): void;
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
    lightColorScheme: string;
    darkColorScheme: string;
    immediateModify: boolean;
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
    fetchNews: boolean;
    theme: FilterConfig;
    presets: ThemePreset[];
    customThemes: CustomSiteConfig[];
    siteList: string[];
    siteListEnabled: string[];
    applyToListedOnly: boolean;
    changeBrowserTheme: boolean;
    syncSettings: boolean;
    syncSitesFixes: boolean;
    automation: '' | 'time' | 'system' | 'location';
    automationBehaviour: 'OnOff' | 'Scheme';
    time: TimeSettings;
    location: LocationSettings;
    previewNewDesign: boolean;
    enableForPDF: boolean;
    enableForProtectedPages: boolean;
    enableContextMenus: boolean;
    detectDarkTheme: boolean;
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
    isInjected: boolean;
    isInDarkList: boolean;
    isDarkThemeDetected: boolean;
}

export interface Message {
    type: string;
    data?: any;
    id?: number;
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
    disableStyleSheetsProxy: boolean;
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
