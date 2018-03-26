import {readText} from './utils/network';
import {parseArray} from '../config/utils';
import {parseInversionFixes} from '../generators/css-filter';
import {parseStaticThemes} from '../generators/static-theme';
import {InversionFix, StaticTheme} from '../definitions';

const CONFIG_URLs = {
    darkSites: {
        remote: 'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/config/dark-sites.config',
        local: '../config/dark-sites.config',
    },
    inversionFixes: {
        remote: 'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/config/inversion-fixes.config',
        local: '../config/inversion-fixes.config',
    },
    staticThemes: {
        remote: 'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/config/static-themes.config',
        local: '../config/static-themes.config',
    },
};
const REMOTE_TIMEOUT_MS = 10 * 1000;
const RELOAD_INTERVAL_MS = 15 * 60 * 1000;

export default class ConfigManager {
    DARK_SITES?: string[];
    INVERSION_FIXES?: InversionFix[];
    RAW_INVERSION_FIXES?: any;
    STATIC_THEMES?: StaticTheme[];
    RAW_STATIC_THEMES?: string;
    DEBUG?: boolean;

    constructor() {
        this.DEBUG = [
            'eimadpbcbfnmbkopoojfekhnkhdbieeh',
            'addon@darkreader.org'
        ].indexOf(chrome.runtime.id) < 0;
        setInterval(() => this.load(), RELOAD_INTERVAL_MS);
    }

    async load() {
        const loadDarkSites = async () => {
            let $sites: string;
            try {
                $sites = await readText({
                    url: CONFIG_URLs.darkSites.remote,
                    timeout: REMOTE_TIMEOUT_MS
                });
            } catch (err) {
                console.error('Dark Sites remote load error', err);
                $sites = await readText({url: CONFIG_URLs.darkSites.local});
            }
            const sites = parseArray($sites);
            this.handleDarkSites(sites)
        };

        const loadInversionFixes = async () => {
            let $fixes: string;
            try {
                $fixes = await readText({
                    url: CONFIG_URLs.inversionFixes.remote,
                    timeout: REMOTE_TIMEOUT_MS
                });
            } catch (err) {
                console.error('Inversion Fixes remote load error', err);
                $fixes = await readText({url: CONFIG_URLs.inversionFixes.local});
            }
            this.RAW_INVERSION_FIXES = $fixes;
            this.handleInversionFixes($fixes);
        };

        const loadStaticThemes = async () => {
            let $themes: string;
            try {
                $themes = await readText({
                    url: CONFIG_URLs.staticThemes.remote,
                    timeout: REMOTE_TIMEOUT_MS
                });
            } catch (err) {
                console.error('Static Theme remote load error', err);
                $themes = await readText({url: CONFIG_URLs.staticThemes.local});
            }
            this.RAW_STATIC_THEMES = $themes;
            this.handleStaticThemes($themes);
        };

        await Promise.all([
            loadDarkSites(),
            loadInversionFixes(),
            loadStaticThemes(),
        ]).catch((err) => console.error('Fatality', err));
    }

    handleInversionFixes($fixes: string) {
        this.INVERSION_FIXES = parseInversionFixes($fixes);
    }

    private handleDarkSites($sites: string[]) {
        this.DARK_SITES = (Array.isArray($sites) ? $sites : [])
            .filter((x) => typeof x === 'string');
    }

    handleStaticThemes($themes: string) {
        this.STATIC_THEMES = parseStaticThemes($themes);
    }
}
