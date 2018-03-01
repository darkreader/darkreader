import {FilterMode} from './background/filter_css_generator';

export interface Extension {
    enabled: boolean;
    config: FilterConfig;
    fonts: string[];
    enable();
    disable();
    setConfig(config: FilterConfig);
    addListener(callback: () => void);
    removeListener(callback: () => void);
    getActiveTabInfo(callback: (info: TabInfo) => void);
    toggleCurrentSite();
    getDevInversionFixesText(): string;
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

export interface TabInfo {
    url: string;
    host: string;
    isProtected: boolean;
    isInDarkList: boolean;
}
