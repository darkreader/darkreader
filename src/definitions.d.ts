import type {FilterMode} from './generators/css-filter';
import type {ThemeEngine} from './generators/theme-engines';
import type {AutomationMode} from './utils/automation';
import type {ParsedColorSchemeConfig} from './utils/colorscheme-parser';
import type {DebugMessageTypeBGtoCS, DebugMessageTypeBGtoUI, DebugMessageTypeCStoBG, MessageTypeBGtoCS, MessageTypeBGtoUI, MessageTypeCStoBG, MessageTypeCStoUI, MessageTypeUItoBG, MessageTypeUItoCS} from './utils/message';

export type ColorScheme = 'dark' | 'light';

export interface ExtensionData {
    isEnabled: boolean;
    isReady: boolean;
    isAllowedFileSchemeAccess: boolean;
    settings: UserSettings;
    news: News[];
    shortcuts: Shortcuts;
    colorScheme: ParsedColorSchemeConfig;
    forcedScheme: 'dark' | 'light' | null;
    activeTab: TabInfo;
    uiHighlights: string[];
}

export interface DevToolsData {
    dynamicFixesText: string;
    filterFixesText: string;
    staticThemesText: string;
}

export interface TabData {
    type: MessageTypeBGtoCS;
    data?: any;
}

export interface ExtensionActions {
    changeSettings(settings: Partial<UserSettings>): void;
    setTheme(theme: Partial<Theme>): void;
    setShortcut(command: string, shortcut: string): Promise<string | null>;
    toggleActiveTab(): void;
    markNewsAsRead(ids: string[]): void;
    markNewsAsDisplayed(ids: string[]): void;
    loadConfig(options: {local: boolean}): void;
    applyDevDynamicThemeFixes(text: string): Promise<void>;
    resetDevDynamicThemeFixes(): void;
    applyDevInversionFixes(text: string): Promise<void>;
    resetDevInversionFixes(): void;
    applyDevStaticThemes(text: string): Promise<void>;
    resetDevStaticThemes(): void;
    startActivation(email: string, key: string): void;
    resetActivation(): void;
    hideHighlights(ids: string[]): void;
}

export interface ExtWrapper {
    data: ExtensionData;
    actions: ExtensionActions;
}

export type ViewProps = ExtWrapper & {
    fonts?: string[];
};

export interface Theme {
    mode: FilterMode;
    brightness: number;
    contrast: number;
    grayscale: number;
    sepia: number;
    useFont: boolean;
    fontFamily: string;
    textStroke: number;
    engine: ThemeEngine;
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

export interface CustomSiteConfig {
    url: string[];
    theme: Theme;
    builtIn?: boolean;
}

export interface ThemePreset {
    id: string;
    name: string;
    urls: string[];
    theme: Theme;
}

export interface Automation {
    enabled: boolean;
    mode: AutomationMode;
    behavior: 'OnOff' | 'Scheme';
}

export interface UserSettings {
    schemeVersion: number;
    enabled: boolean;
    fetchNews: boolean;
    theme: Theme;
    presets: ThemePreset[];
    customThemes: CustomSiteConfig[];
    enabledByDefault: boolean;
    enabledFor: string[];
    disabledFor: string[];
    changeBrowserTheme: boolean;
    syncSettings: boolean;
    syncSitesFixes: boolean;
    automation: Automation;
    time: TimeSettings;
    location: LocationSettings;
    previewNewDesign: boolean;
    previewNewestDesign: boolean;
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
    latitude: number | null;
    longitude: number | null;
}

export interface TabInfo {
    url: string;
    id: number | null;
    documentId: string | null;
    isProtected: boolean;
    isInjected: boolean | null;
    isInDarkList: boolean;
    isDarkThemeDetected: boolean | null;
}

export interface MessageCStoBG {
    id?: string;
    scriptId?: string;
    type: MessageTypeCStoBG;
    data?: any;
}

export interface MessageUItoCS {
    type: MessageTypeUItoCS;
}

export interface MessageCStoUI {
    type: MessageTypeCStoUI;
    data: any;
}

export interface MessageBGtoCS {
    id?: string;
    scriptId?: string;
    type: MessageTypeBGtoCS;
    data?: any;
    error?: any;
}

export interface MessageUItoBG {
    type: MessageTypeUItoBG;
    data?: any;
    error?: any;
}

export interface MessageBGtoUI {
    type: MessageTypeBGtoUI;
    data?: any;
}

export interface DebugMessageBGtoCS {
    type: DebugMessageTypeBGtoCS;
}

export interface DebugMessageBGtoUI {
    type: DebugMessageTypeBGtoUI;
}

export interface DebugMessageCStoBG {
    type: DebugMessageTypeCStoBG;
    data?: any;
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
    disableCustomElementRegistryProxy: boolean;
}

export interface InversionFix {
    url: string[];
    invert: string[];
    noinvert: string[];
    removebg: string[];
    css: string;
}

export interface DetectorHint {
    url: string[];
    target: string;
    match: string[];
    noDarkTheme: boolean;
    systemTheme: boolean;
    iframe: boolean;
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
    read?: boolean;
    displayed?: boolean;
    badge?: string;
    icon?: string;
}

// These values need to match those in Manifest
export type Command = 'toggle' | 'addSite' | 'switchEngine';
