import {readText} from './utils/network';
import {parseArray} from '../utils/text';
import {getDuration} from '../utils/time';
import {parseInversionFixes} from '../generators/css-filter';
import {parseDynamicThemeFixes} from '../generators/dynamic-theme';
import {parseStaticThemes} from '../generators/static-theme';
import {InversionFix, StaticTheme, DynamicThemeFix} from '../definitions';

const CONFIG_URLs = {
    darkSites: {
        remote: 'https://raw.githubusercontent.com/praveen001/darkreader/master/src/config/dark-sites.config',
        local: '../config/dark-sites.config',
    },
    unsupportedSites: {
        remote: 'https://raw.githubusercontent.com/praveen001/darkreader/master/src/config/unsupported-sites.config',
        local: '../config/unsupported-sites.config',
    },
    supportedSites: {
        remote: 'https://raw.githubusercontent.com/praveen001/darkreader/master/src/config/supported-sites.config',
        local: '../config/supported-sites.config',
    },
    dynamicThemeFixes: {
        remote: 'https://raw.githubusercontent.com/praveen001/darkreader/master/src/config/dynamic-theme-fixes.config',
        local: '../config/dynamic-theme-fixes.config',
    },
    inversionFixes: {
        remote: 'https://raw.githubusercontent.com/praveen001/darkreader/master/src/config/inversion-fixes.config',
        local: '../config/inversion-fixes.config',
    },
    staticThemes: {
        remote: 'https://raw.githubusercontent.com/praveen001/darkreader/master/src/config/static-themes.config',
        local: '../config/static-themes.config',
    },
};
const REMOTE_TIMEOUT_MS = getDuration({seconds: 10});

export default class ConfigManager {
    DARK_SITES?: string[];
    UNSUPPORTED_SITES?: string[];
    SUPPORTED_SITES?: string[];
    DYNAMIC_THEME_FIXES?: DynamicThemeFix[];
    INVERSION_FIXES?: InversionFix[];
    STATIC_THEMES?: StaticTheme[];

    raw = {
        darkSites: null,
        unsupportedSites: null,
        supportedSites: null,
        dynamicThemeFixes: null,
        inversionFixes: null,
        staticThemes: null,
    };

    overrides = {
        darkSites: null,
        unsupportedSites: null,
        supportedSites: null,
        dynamicThemeFixes: null,
        inversionFixes: null,
        staticThemes: null,
    };

    private async loadConfig({
        name,
        local,
        localURL,
        remoteURL,
        success,
    }) {
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
        success($config);
    }

    private async loadDarkSites({local}) {
        await this.loadConfig({
            name: 'Dark Sites',
            local,
            localURL: CONFIG_URLs.darkSites.local,
            remoteURL: CONFIG_URLs.darkSites.remote,
            success: ($sites) => {
                this.raw.darkSites = $sites;
                this.handleDarkSites();
            },
        });
    }

    private async loadUnsupportedSites({local}) {
        await this.loadConfig({
            name: 'Unsupported Sites',
            local,
            localURL: CONFIG_URLs.unsupportedSites.local,
            remoteURL: CONFIG_URLs.unsupportedSites.remote,
            success: ($sites) => {
                this.raw.unsupportedSites = $sites;
                this.handleUnsupportedSites();
            },
        });
    }

    private async loadSupportedSites({local}) {
        await this.loadConfig({
            name: 'Supported Sites',
            local,
            localURL: CONFIG_URLs.supportedSites.local,
            remoteURL: CONFIG_URLs.supportedSites.remote,
            success: ($sites) => {
                this.raw.supportedSites = $sites;
                this.handleSupportedSites();
            },
        });
    }

    private async loadDynamicThemeFixes({local}) {
        await this.loadConfig({
            name: 'Dynamic Theme Fixes',
            local,
            localURL: CONFIG_URLs.dynamicThemeFixes.local,
            remoteURL: CONFIG_URLs.dynamicThemeFixes.remote,
            success: ($fixes) => {
                this.raw.dynamicThemeFixes = $fixes;
                this.handleDynamicThemeFixes();
            },
        });
    }

    private async loadInversionFixes({local}) {
        await this.loadConfig({
            name: 'Inversion Fixes',
            local,
            localURL: CONFIG_URLs.inversionFixes.local,
            remoteURL: CONFIG_URLs.inversionFixes.remote,
            success: ($fixes) => {
                this.raw.inversionFixes = $fixes;
                this.handleInversionFixes();
            },
        });
    }

    private async loadStaticThemes({local}) {
        await this.loadConfig({
            name: 'Static Themes',
            local,
            localURL: CONFIG_URLs.staticThemes.local,
            remoteURL: CONFIG_URLs.staticThemes.remote,
            success: ($themes) => {
                this.raw.staticThemes = $themes;
                this.handleStaticThemes();
            },
        });
    }

    async load(config: {local: boolean}) {
        await Promise.all([
            this.loadDarkSites(config),
            this.loadDynamicThemeFixes(config),
            this.loadInversionFixes(config),
            this.loadStaticThemes(config),
            this.loadUnsupportedSites(config),
            this.loadSupportedSites(config),
        ]).catch((err) => console.error('Fatality', err));
    }

    private handleDarkSites() {
        const $sites = this.overrides.darkSites || this.raw.darkSites;
        this.DARK_SITES = parseArray($sites);
    }

    private handleUnsupportedSites() {
        const $sites = this.overrides.unsupportedSites || this.raw.unsupportedSites;
        this.UNSUPPORTED_SITES = parseArray($sites);
    }

    private handleSupportedSites() {
        const $sites = this.overrides.supportedSites || this.raw.supportedSites;
        this.SUPPORTED_SITES = parseArray($sites);
    }

    handleDynamicThemeFixes() {
        const $fixes = this.overrides.dynamicThemeFixes || this.raw.dynamicThemeFixes;
        this.DYNAMIC_THEME_FIXES = parseDynamicThemeFixes($fixes);
    }

    handleInversionFixes() {
        const $fixes = this.overrides.inversionFixes || this.raw.inversionFixes;
        this.INVERSION_FIXES = parseInversionFixes($fixes);
    }

    handleStaticThemes() {
        const $themes = this.overrides.staticThemes || this.raw.staticThemes;
        this.STATIC_THEMES = parseStaticThemes($themes);
    }
}
