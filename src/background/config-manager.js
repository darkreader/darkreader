// @ts-check
import {readText} from './utils/network';
import {parseArray} from '../utils/text';
import {getDuration} from '../utils/time';
import {indexSitesFixesConfig} from '../generators/utils/parse';
import {ParseColorSchemeConfig} from '../utils/colorscheme-parser';
import {logWarn} from '../utils/log';
import {DEFAULT_COLORSCHEME} from '../defaults';

/** @typedef {{name?: string; local: boolean; localURL?: string; remoteURL?: string}} Config */
/** @typedef {import('../definitions').DynamicThemeFix} DynamicThemeFix */
/** @typedef {import('../definitions').InversionFix} InversionFix */
/** @typedef {import('../definitions').StaticTheme} StaticTheme */
/** 
 * @template T
 * @typedef {import('../generators/utils/parse').SitePropsIndex<T>} SitePropsIndex
 */
/** @typedef {import('../utils/colorscheme-parser').ParsedColorSchemeConfig} ParsedColorSchemeConfig */

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
    colorSchemes: {
        remote: 'https://raw.githubusercontent.com/darkreader/darkreader/master/src/config/color-schemes.drconf',
        local: '../config/color-schemes.drconf',
    },
};
const REMOTE_TIMEOUT_MS = getDuration({seconds: 10});

export default class ConfigManager {
    /** @type {string[]} */
    DARK_SITES;
    /** @type {SitePropsIndex<DynamicThemeFix>} */
    DYNAMIC_THEME_FIXES_INDEX;
    /** @type {string} */
    DYNAMIC_THEME_FIXES_RAW;
    /** @type {SitePropsIndex<InversionFix>} */
    INVERSION_FIXES_INDEX;
    /** @type {string} */
    INVERSION_FIXES_RAW;
    /** @type {SitePropsIndex<StaticTheme>} */
    STATIC_THEMES_INDEX;
    /** @type {string} */
    STATIC_THEMES_RAW;
    /** @type {ParsedColorSchemeConfig} */
    COLOR_SCHEMES_RAW;

    raw = {
        darkSites: /** @type {string} */(null),
        dynamicThemeFixes: /** @type {string} */(null),
        inversionFixes: /** @type {string} */(null),
        staticThemes: /** @type {string} */(null),
        colorSchemes: /** @type {string} */(null),
    };

    overrides = {
        darkSites: /** @type {string} */(null),
        dynamicThemeFixes: /** @type {string} */(null),
        inversionFixes: /** @type {string} */(null),
        staticThemes: /** @type {string} */(null),
    };

    /**
     * @param {Config} config
     * @returns {Promise<string>}
     */
    async #loadConfig({
        name,
        local,
        localURL,
        remoteURL,
    }) {
        /** @type {string} */
        let $config;
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

    /**
     * @param {Config} config
     * @returns {Promise<void>}
     */
    async #loadColorSchemes({local}) {
        const $config = await this.#loadConfig({
            name: 'Color Schemes',
            local,
            localURL: CONFIG_URLs.colorSchemes.local,
            remoteURL: CONFIG_URLs.colorSchemes.remote,
        });
        this.raw.colorSchemes = $config;
        this.#handleColorSchemes();
    }

    /**
     * @param {Config} config
     * @returns {Promise<void>}
     */
    async #loadDarkSites({local}) {
        const sites = await this.#loadConfig({
            name: 'Dark Sites',
            local,
            localURL: CONFIG_URLs.darkSites.local,
            remoteURL: CONFIG_URLs.darkSites.remote,
        });
        this.raw.darkSites = sites;
        this.#handleDarkSites();
    }

    /**
     * @param {Config} config
     * @returns {Promise<void>}
     */
    async #loadDynamicThemeFixes({local}) {
        const fixes = await this.#loadConfig({
            name: 'Dynamic Theme Fixes',
            local,
            localURL: CONFIG_URLs.dynamicThemeFixes.local,
            remoteURL: CONFIG_URLs.dynamicThemeFixes.remote,
        });
        this.raw.dynamicThemeFixes = fixes;
        this.handleDynamicThemeFixes();
    }

    /**
     * @param {Config} config
     * @returns {Promise<void>}
     */
    async #loadInversionFixes({local}) {
        const fixes = await this.#loadConfig({
            name: 'Inversion Fixes',
            local,
            localURL: CONFIG_URLs.inversionFixes.local,
            remoteURL: CONFIG_URLs.inversionFixes.remote,
        });
        this.raw.inversionFixes = fixes;
        this.handleInversionFixes();
    }

    /**
     * @param {Config} config
     * @returns {Promise<void>}
     */
    async #loadStaticThemes({local}) {
        const themes = await this.#loadConfig({
            name: 'Static Themes',
            local,
            localURL: CONFIG_URLs.staticThemes.local,
            remoteURL: CONFIG_URLs.staticThemes.remote,
        });
        this.raw.staticThemes = themes;
        this.handleStaticThemes();
    }

    /**
     * @param {Config} config
     * @returns {Promise<void>}
     */
    async load(config) {
        await Promise.all([
            this.#loadColorSchemes(config),
            this.#loadDarkSites(config),
            this.#loadDynamicThemeFixes(config),
            this.#loadInversionFixes(config),
            this.#loadStaticThemes(config),
        ]).catch((err) => console.error('Fatality', err));
    }

    #handleColorSchemes() {
        const $config = this.raw.colorSchemes;
        const {result, error} = ParseColorSchemeConfig($config);
        if (error) {
            logWarn(`Color Schemes parse error, defaulting to fallback. ${error}.`);
            this.COLOR_SCHEMES_RAW = DEFAULT_COLORSCHEME;
            return;
        }
        this.COLOR_SCHEMES_RAW = result;
    }

    #handleDarkSites() {
        const $sites = this.overrides.darkSites || this.raw.darkSites;
        this.DARK_SITES = parseArray($sites);
    }

    handleDynamicThemeFixes() {
        const $fixes = this.overrides.dynamicThemeFixes || this.raw.dynamicThemeFixes;
        this.DYNAMIC_THEME_FIXES_INDEX = indexSitesFixesConfig($fixes);
        this.DYNAMIC_THEME_FIXES_RAW = $fixes;
    }

    handleInversionFixes() {
        const $fixes = this.overrides.inversionFixes || this.raw.inversionFixes;
        this.INVERSION_FIXES_INDEX = indexSitesFixesConfig($fixes);
        this.INVERSION_FIXES_RAW = $fixes;
    }

    handleStaticThemes() {
        const $themes = this.overrides.staticThemes || this.raw.staticThemes;
        this.STATIC_THEMES_INDEX = indexSitesFixesConfig($themes);
        this.STATIC_THEMES_RAW = $themes;
    }
}
