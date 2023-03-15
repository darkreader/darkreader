import {readText} from './utils/network';
import {getDuration} from '../utils/time';
import {indexSiteListConfig, indexSitesFixesConfig, isURLInSiteList} from '../generators/utils/parse';
import type {InversionFix, StaticTheme, DynamicThemeFix} from '../definitions';
import type {SiteListIndex, SitePropsIndex} from '../generators/utils/parse';
import type {ParsedColorSchemeConfig} from '../utils/colorscheme-parser';
import {parseColorSchemeConfig} from '../utils/colorscheme-parser';
import {logWarn} from './utils/log';
import {DEFAULT_COLORSCHEME} from '../defaults';
import UserStorage from './user-storage';
import {CONFIG_URL_BASE} from '../utils/links';

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
    private static DARK_SITES_INDEX: SiteListIndex | null;
    public static DYNAMIC_THEME_FIXES_INDEX: SitePropsIndex<DynamicThemeFix> | null;
    public static DYNAMIC_THEME_FIXES_RAW: string | null;
    public static INVERSION_FIXES_INDEX: SitePropsIndex<InversionFix> | null;
    public static INVERSION_FIXES_RAW: string | null;
    public static STATIC_THEMES_INDEX: SitePropsIndex<StaticTheme> | null;
    public static STATIC_THEMES_RAW: string | null;
    public static COLOR_SCHEMES_RAW: ParsedColorSchemeConfig | null;

    public static raw = {
        darkSites: null as string | null,
        dynamicThemeFixes: null as string | null,
        inversionFixes: null as string | null,
        staticThemes: null as string | null,
        colorSchemes: null as string | null,
    };

    public static overrides = {
        darkSites: null as string | null,
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
                    timeout: REMOTE_TIMEOUT_MS
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

    public static async load(config?: LocalConfig) {
        if (!config) {
            await UserStorage.loadSettings();
            config = {
                local: !UserStorage.settings.syncSitesFixes
            };
        }

        await Promise.all([
            ConfigManager.loadColorSchemes(config),
            ConfigManager.loadDarkSites(config),
            ConfigManager.loadDynamicThemeFixes(config),
            ConfigManager.loadInversionFixes(config),
            ConfigManager.loadStaticThemes(config),
        ]).catch((err) => console.error('Fatality', err));
    }

    private static handleColorSchemes() {
        const $config = ConfigManager.raw.colorSchemes;
        const {result, error} = parseColorSchemeConfig($config || '');
        if (error) {
            logWarn(`Color Schemes parse error, defaulting to fallback. ${error}.`);
            ConfigManager.COLOR_SCHEMES_RAW = DEFAULT_COLORSCHEME;
            return;
        }
        ConfigManager.COLOR_SCHEMES_RAW = result;
    }

    private static handleDarkSites() {
        const $sites = ConfigManager.overrides.darkSites || ConfigManager.raw.darkSites;
        ConfigManager.DARK_SITES_INDEX = indexSiteListConfig($sites || '');
    }

    public static handleDynamicThemeFixes() {
        const $fixes = ConfigManager.overrides.dynamicThemeFixes || ConfigManager.raw.dynamicThemeFixes || '';
        ConfigManager.DYNAMIC_THEME_FIXES_INDEX = indexSitesFixesConfig<DynamicThemeFix>($fixes);
        ConfigManager.DYNAMIC_THEME_FIXES_RAW = $fixes;
    }

    public static handleInversionFixes() {
        const $fixes = ConfigManager.overrides.inversionFixes || ConfigManager.raw.inversionFixes || '';
        ConfigManager.INVERSION_FIXES_INDEX = indexSitesFixesConfig<InversionFix>($fixes);
        ConfigManager.INVERSION_FIXES_RAW = $fixes;
    }

    public static handleStaticThemes() {
        const $themes = ConfigManager.overrides.staticThemes || ConfigManager.raw.staticThemes || '';
        ConfigManager.STATIC_THEMES_INDEX = indexSitesFixesConfig<StaticTheme>($themes);
        ConfigManager.STATIC_THEMES_RAW = $themes;
    }

    public static isURLInDarkList(url: string): boolean {
        return isURLInSiteList(url, ConfigManager.DARK_SITES_INDEX);
    }
}
