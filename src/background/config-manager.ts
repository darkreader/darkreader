import {readText} from './utils/network';
import {parseArray} from '../utils/text';
import {getDuration} from '../utils/time';
import {indexInversionFixes, parseInversionFixes} from '../generators/css-filter';
import {indexDynamicThemeFixes, parseDynamicThemeFixes} from '../generators/dynamic-theme';
import {indexStaticThemes, parseStaticThemes} from '../generators/static-theme';
import type {InversionFix, StaticTheme, DynamicThemeFix} from '../definitions';
import type {SitePropsIndex} from '../generators/utils/parse';

const CONFIG_URLs = {
    darkSites: {
        remote: 'https://raw.githubusercontent.com/darkreader/darkreader/master/src/config/dark-sites.config',
        local: '../config/dark-sites.config',
    },
    dynamicThemeFixes: {
        remote: 'https://raw.githubusercontent.com/darkreader/darkreader/master/src/config/dynamic-theme-fixes.config',
        local: '../config/dynamic-theme-fixes.config',
    },
    inversionFixes: {
        remote: 'https://raw.githubusercontent.com/darkreader/darkreader/master/src/config/inversion-fixes.config',
        local: '../config/inversion-fixes.config',
    },
    staticThemes: {
        remote: 'https://raw.githubusercontent.com/darkreader/darkreader/master/src/config/static-themes.config',
        local: '../config/static-themes.config',
    },
};
const REMOTE_TIMEOUT_MS = getDuration({seconds: 10});

interface Config {
    name?: string;
    local: boolean;
    localURL?: string;
    remoteURL?: string;
}

export default class ConfigManager {
    DARK_SITES?: string[];
    DYNAMIC_THEME_FIXES_INDEX?: SitePropsIndex<DynamicThemeFix>;
    DYNAMIC_THEME_FIXES_RAW?: string;
    INVERSION_FIXES_INDEX?: SitePropsIndex<InversionFix>;
    INVERSION_FIXES_RAW?: string;
    STATIC_THEMES_INDEX?: SitePropsIndex<StaticTheme>;
    STATIC_THEMES_RAW?: string;

    raw = {
        darkSites: null as string,
        dynamicThemeFixes: null as string,
        inversionFixes: null as string,
        staticThemes: null as string,
    };

    overrides = {
        darkSites: null as string,
        dynamicThemeFixes: null as string,
        inversionFixes: null as string,
        staticThemes: null as string,
    };

    private async loadConfig({
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

    private async loadDarkSites({local}: Config) {
        const sites = await this.loadConfig({
            name: 'Dark Sites',
            local,
            localURL: CONFIG_URLs.darkSites.local,
            remoteURL: CONFIG_URLs.darkSites.remote,
        });
        this.raw.darkSites = sites;
        this.handleDarkSites();
    }

    private async loadDynamicThemeFixes({local}: Config) {
        const fixes = await this.loadConfig({
            name: 'Dynamic Theme Fixes',
            local,
            localURL: CONFIG_URLs.dynamicThemeFixes.local,
            remoteURL: CONFIG_URLs.dynamicThemeFixes.remote,
        });
        this.raw.dynamicThemeFixes = fixes;
        this.handleDynamicThemeFixes();
    }

    private async loadInversionFixes({local}: Config) {
        const fixes = await this.loadConfig({
            name: 'Inversion Fixes',
            local,
            localURL: CONFIG_URLs.inversionFixes.local,
            remoteURL: CONFIG_URLs.inversionFixes.remote,
        });
        this.raw.inversionFixes = fixes;
        this.handleInversionFixes();
    }

    private async loadStaticThemes({local}: Config) {
        const themes = await this.loadConfig({
            name: 'Static Themes',
            local,
            localURL: CONFIG_URLs.staticThemes.local,
            remoteURL: CONFIG_URLs.staticThemes.remote,
        });
        this.raw.staticThemes = themes;
        this.handleStaticThemes();
    }

    async load(config: Config) {
        await Promise.all([
            this.loadDarkSites(config),
            this.loadDynamicThemeFixes(config),
            this.loadInversionFixes(config),
            this.loadStaticThemes(config),
        ]).catch((err) => console.error('Fatality', err));
    }

    private handleDarkSites() {
        const $sites = this.overrides.darkSites || this.raw.darkSites;
        this.DARK_SITES = parseArray($sites);
    }

    handleDynamicThemeFixes() {
        const $fixes = this.overrides.dynamicThemeFixes || this.raw.dynamicThemeFixes;
        this.DYNAMIC_THEME_FIXES_INDEX = indexDynamicThemeFixes($fixes);
        this.DYNAMIC_THEME_FIXES_RAW = $fixes;
    }

    handleInversionFixes() {
        const $fixes = this.overrides.inversionFixes || this.raw.inversionFixes;
        this.INVERSION_FIXES_INDEX = indexInversionFixes($fixes);
        this.INVERSION_FIXES_RAW = $fixes;
    }

    handleStaticThemes() {
        const $themes = this.overrides.staticThemes || this.raw.staticThemes;
        this.STATIC_THEMES_INDEX = indexStaticThemes($themes);
        this.STATIC_THEMES_RAW = $themes;
    }
}
