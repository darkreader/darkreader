import {readJson, readText} from './utils/network';
import {simpleClone} from './utils/clone';
import {fillInversionFixesConfig} from '../generators/css-filter';
import {parseUrlSelectorConfig} from '../generators/static-theme';
import {InversionFixes, StaticTheme} from '../definitions';

const CONFIG_URLs = {
    darkSites: {
        remote: 'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/config/dark_sites.json',
        local: '../config/dark_sites.json',
    },
    inversionFixes: {
        remote: 'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/config/fix_inversion.json',
        local: '../config/fix_inversion.json',
    },
    staticThemes: {
        remote: 'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/config/static-themes.cfg',
        local: '../config/static-themes.cfg',
    },
};
const REMOTE_TIMEOUT_MS = 10 * 1000;
const RELOAD_INTERVAL_MS = 15 * 60 * 1000;

export default class ConfigManager {
    DARK_SITES?: string[];
    INVERSION_FIXES?: InversionFixes;
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
        const loadLocalDarkSites = async () => {
            return await readJson<string[]>({url: CONFIG_URLs.darkSites.local});
        };

        const loadLocalInversionFixes = async () => {
            return await readJson<InversionFixes>({url: CONFIG_URLs.inversionFixes.local});
        };

        const loadLocalStaticThemes = async () => {
            return await readText({url: CONFIG_URLs.staticThemes.local});
        };

        const loadDarkSites = async () => {
            let $sites: string[];
            try {
                $sites = await readJson<string[]>({
                    url: CONFIG_URLs.darkSites.remote,
                    timeout: REMOTE_TIMEOUT_MS
                });
            } catch (err) {
                console.error('Dark Sites remote load error', err);
                $sites = await loadLocalDarkSites();
            }
            this.handleDarkSites($sites)
        };

        const loadInversionFixes = async () => {
            let $fixes: InversionFixes;
            try {
                $fixes = await readJson<InversionFixes>({
                    url: CONFIG_URLs.inversionFixes.remote,
                    timeout: REMOTE_TIMEOUT_MS
                });
            } catch (err) {
                console.error('Inversion Fixes remote load error', err);
                $fixes = await loadLocalInversionFixes();
            }
            this.RAW_INVERSION_FIXES = simpleClone($fixes);
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
                $themes = await loadLocalStaticThemes();
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

    handleInversionFixes($fixes: InversionFixes) {
        this.INVERSION_FIXES = fillInversionFixesConfig($fixes);
    }

    private handleDarkSites($sites: string[]) {
        this.DARK_SITES = (Array.isArray($sites) ? $sites : [])
            .filter((x) => typeof x === 'string');
    }

    handleStaticThemes($themes: string) {
        this.STATIC_THEMES = parseUrlSelectorConfig($themes);
    }
}
