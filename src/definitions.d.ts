import {FilterMode} from './generators/css-filter';

export interface ExtensionData {
    enabled: boolean;
    ready: boolean;
    filterConfig: FilterConfig;
    fonts: string[];
    shortcuts: Shortcuts;
    devInversionFixesText: string;
}

export interface ExtensionActions {
    enable();
    disable();
    setConfig(config: FilterConfig);
    toggleSitePattern(pattern: string);
    applyDevInversionFixes(json: string): Promise<void>;
    resetDevInversionFixes();
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

export interface Shortcuts {
    [name: string]: string;
}

export interface InversionFixes {
    common: InversionFix;
    sites: SiteFix[];
}

export interface InversionFix {
    invert: string[];
    noinvert: string[];
    removebg: string[];
    rules: string[];
}

export interface SiteFix extends InversionFix {
    url: string | string[];
}
