import {FilterMode} from './generators/css-filter';

export interface ExtensionData {
    enabled: boolean;
    ready: boolean;
    filterConfig: FilterConfig;
    fonts: string[];
    shortcuts: Shortcuts;
    devDynamicThemeFixesText: string;
    devInversionFixesText: string;
    devStaticThemesText: string;
}

export interface ExtensionActions {
    enable();
    disable();
    setConfig(config: FilterConfig);
    toggleSitePattern(pattern: string);
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

export interface FilterConfig {
    mode?: FilterMode;
    brightness?: number;
    contrast?: number;
    grayscale?: number;
    sepia?: number;
    useFont?: boolean;
    fontFamily?: string;
    textStroke?: number;
    siteList?: string[];
    invertListed?: boolean;
    engine?: string;
}

export interface UserSettings {
    enabled: boolean;
    config: FilterConfig;
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
    inline?: string[];
    invert?: string[];
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
