import {DEFAULT_COLORSCHEME} from '../defaults';
import type {InversionFix, StaticTheme, DynamicThemeFix, DetectorHint} from '../definitions';
import {indexSitesFixesConfig} from '../generators/utils/parse';
import type {SitePropsIndex} from '../generators/utils/parse';
import type {ParsedColorSchemeConfig} from '../utils/colorscheme-parser';
import {parseColorSchemeConfig} from '../utils/colorscheme-parser';
import {CONFIG_URL_BASE} from '../utils/links';
import {parseArray} from '../utils/text';
import {getDuration} from '../utils/time';
import {indexURLTemplateList, isURLInIndexedList} from '../utils/url';
import type {URLTemplateIndex} from '../utils/url';
import UserStorage from './user-storage';
import {logWarn} from './utils/log';
import {readText} from './utils/network';

const CONFIG_URLs = {
    darkSites: {
        remote: `${CONFIG_URL_BASE}/dark-sites.config`,
        local: '../config/dark-sites.config',
    },
    dynamicThemeFixes: {
        remote: `${CONFIG_URL_BASE}/dynamic-theme-fixes.config`,
        local: '../config/dynamic-theme-fixes.config',
    },
    inversionFixes: {
        remote: `${CONFIG_URL_BASE}/inversion-fixes.config`,
        local: '../config/inversion-fixes.config',
    },
    staticThemes: {
        remote: `${CONFIG_URL_BASE}/static-themes.config`,
        local: '../config/static-themes.config',
    },
    colorSchemes: {
        remote: `${CONFIG_URL_BASE}/color-schemes.drconf`,
        local: '../config/color-schemes.drconf',
    },
    detectorHints: {
        remote: `${CONFIG_URL_BASE}/detector-hints.config`,
        local: '../config/detector-hints.config',
    },
};

const REMOTE_TIMEOUT_MS = getDuration({seconds: 10});

interface LocalConfig {
    local: boolean;
}

interface Config extends LocalConfig {
    name?: string;
    local: boolean;
    localURL: string;
    remoteURL?: string;
}

export default class ConfigManager {
    private static DARK_SITES_INDEX: URLTemplateIndex | null;
    static DETECTOR_HINTS_INDEX: SitePropsIndex<DetectorHint> | null;
    static DETECTOR_HINTS_RAW: string | null;
    static DYNAMIC_THEME_FIXES_INDEX: SitePropsIndex<DynamicThemeFix> | null;
    static DYNAMIC_THEME_FIXES_RAW: string | null;
    static INVERSION_FIXES_INDEX: SitePropsIndex<InversionFix> | null;
    static INVERSION_FIXES_RAW: string | null;
    static STATIC_THEMES_INDEX: SitePropsIndex<StaticTheme> | null;
    static STATIC_THEMES_RAW: string | null;
    static COLOR_SCHEMES_RAW: ParsedColorSchemeConfig | null;

    static raw = {
        darkSites: null as string | null,
        detectorHints: null as string | null,
        dynamicThemeFixes: null as string | null,
        inversionFixes: null as string | null,
        staticThemes: null as string | null,
        colorSchemes: null as string | null,
    };

    static overrides = {
        darkSites: null as string | null,
        detectorHints: null as string | null,
        dynamicThemeFixes: null as string | null,
        inversionFixes: null as string | null,
        staticThemes: null as string | null,
    };

    private static async loadConfig({
        name,
        local,
        localURL,
        remoteURL,
    }: Config) {
        let $config: string;
        const loadLocal = async () => await readText({url: localURL});
        if (local) {
            $config = await loadLocal();
        } else {
            try {
                $config = await readText({
                    url: `${remoteURL}?nocache=${Date.now()}`,
                    timeout: REMOTE_TIMEOUT_MS,
                });
            } catch (err) {
                console.error(`${name} remote load error`, err);
                $config = await loadLocal();
            }
        }
        return $config;
    }

    private static async loadColorSchemes({local}: LocalConfig) {
        const $config = await ConfigManager.loadConfig({
            name: 'Color Schemes',
            local,
            localURL: CONFIG_URLs.colorSchemes.local,
            remoteURL: CONFIG_URLs.colorSchemes.remote,
        });
        ConfigManager.raw.colorSchemes = $config;
        ConfigManager.handleColorSchemes();
    }

    private static async loadDarkSites({local}: LocalConfig) {
        const sites = await ConfigManager.loadConfig({
            name: 'Dark Sites',
            local,
            localURL: CONFIG_URLs.darkSites.local,
            remoteURL: CONFIG_URLs.darkSites.remote,
        });
        ConfigManager.raw.darkSites = sites;
        ConfigManager.handleDarkSites();
    }

    private static async loadDetectorHints({local}: LocalConfig) {
        const $config = await ConfigManager.loadConfig({
            name: 'Detector Hints',
            local,
            localURL: CONFIG_URLs.detectorHints.local,
            remoteURL: CONFIG_URLs.detectorHints.remote,
        });
        ConfigManager.raw.detectorHints = $config;
        ConfigManager.handleDetectorHints();
    }

    private static async loadDynamicThemeFixes({local}: LocalConfig) {
        const fixes = await ConfigManager.loadConfig({
            name: 'Dynamic Theme Fixes',
            local,
            localURL: CONFIG_URLs.dynamicThemeFixes.local,
            remoteURL: CONFIG_URLs.dynamicThemeFixes.remote,
        });
        ConfigManager.raw.dynamicThemeFixes = fixes;
        ConfigManager.handleDynamicThemeFixes();
    }

    private static async loadInversionFixes({local}: LocalConfig) {
        const fixes = await ConfigManager.loadConfig({
            name: 'Inversion Fixes',
            local,
            localURL: CONFIG_URLs.inversionFixes.local,
            remoteURL: CONFIG_URLs.inversionFixes.remote,
        });
        ConfigManager.raw.inversionFixes = fixes;
        ConfigManager.handleInversionFixes();
    }

    private static async loadStaticThemes({local}: LocalConfig) {
        const themes = await ConfigManager.loadConfig({
            name: 'Static Themes',
            local,
            localURL: CONFIG_URLs.staticThemes.local,
            remoteURL: CONFIG_URLs.staticThemes.remote,
        });
        ConfigManager.raw.staticThemes = themes;
        ConfigManager.handleStaticThemes();
    }

    static async load(config?: LocalConfig): Promise<void> {
        if (!config) {
            await UserStorage.loadSettings();
            config = {
                local: !UserStorage.settings.syncSitesFixes,
            };
        }

        await Promise.all([
            ConfigManager.loadColorSchemes(config),
            ConfigManager.loadDarkSites(config),
            ConfigManager.loadDetectorHints(config),
            ConfigManager.loadDynamicThemeFixes(config),
            ConfigManager.loadInversionFixes(config),
            ConfigManager.loadStaticThemes(config),
        ]).catch((err) => console.error('Fatality', err));
    }

    private static handleColorSchemes(): void {
        const $config = ConfigManager.raw.colorSchemes;
        const {result, error} = parseColorSchemeConfig($config || '');
        if (error) {
            logWarn(`Color Schemes parse error, defaulting to fallback. ${error}.`);
            ConfigManager.COLOR_SCHEMES_RAW = DEFAULT_COLORSCHEME;
            return;
        }
        ConfigManager.COLOR_SCHEMES_RAW = result;
    }

    private static handleDarkSites(): void {
        const $sites = ConfigManager.overrides.darkSites || ConfigManager.raw.darkSites;
        const templates = parseArray($sites!);
        ConfigManager.DARK_SITES_INDEX = indexURLTemplateList(templates);
    }

    private static handleDetectorHints(): void {
        const $hints = ConfigManager.overrides.detectorHints || ConfigManager.raw.detectorHints || '';
        ConfigManager.DETECTOR_HINTS_INDEX = indexSitesFixesConfig<DetectorHint>($hints);
        ConfigManager.DETECTOR_HINTS_RAW = $hints;
    }

    static handleDynamicThemeFixes(): void {
        const $fixes = ConfigManager.overrides.dynamicThemeFixes || ConfigManager.raw.dynamicThemeFixes || '';
        ConfigManager.DYNAMIC_THEME_FIXES_INDEX = indexSitesFixesConfig<DynamicThemeFix>($fixes);
        ConfigManager.DYNAMIC_THEME_FIXES_RAW = $fixes;
    }

    static handleInversionFixes(): void {
        const $fixes = ConfigManager.overrides.inversionFixes || ConfigManager.raw.inversionFixes || '';
        ConfigManager.INVERSION_FIXES_INDEX = indexSitesFixesConfig<InversionFix>($fixes);
        ConfigManager.INVERSION_FIXES_RAW = $fixes;
    }

    static handleStaticThemes(): void {
        const $themes = ConfigManager.overrides.staticThemes || ConfigManager.raw.staticThemes || '';
        ConfigManager.STATIC_THEMES_INDEX = indexSitesFixesConfig<StaticTheme>($themes);
        ConfigManager.STATIC_THEMES_RAW = $themes;
    }

    static isURLInDarkList(url: string): boolean {
        if (!ConfigManager.DARK_SITES_INDEX) {
            return false;
        }
        return isURLInIndexedList(url, ConfigManager.DARK_SITES_INDEX);
    }
}
