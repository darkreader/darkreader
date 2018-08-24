import {readText} from './utils/network';
import {parseArray} from '../utils/text';
import {getDuration} from '../utils/time';
import {parseInversionFixes} from '../generators/css-filter';
import {parseDynamicThemeFixes} from '../generators/dynamic-theme';
import {parseStaticThemes} from '../generators/static-theme';
import {InversionFix, StaticTheme, DynamicThemeFix} from '../definitions';

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
const RELOAD_INTERVAL_MS = getDuration({minutes: 15});

export default class ConfigManager {
    DARK_SITES?: string[];
    DYNAMIC_THEME_FIXES?: DynamicThemeFix[];
    RAW_DYNAMIC_THEME_FIXES?: string;
    INVERSION_FIXES?: InversionFix[];
    RAW_INVERSION_FIXES?: string;
    STATIC_THEMES?: StaticTheme[];
    RAW_STATIC_THEMES?: string;

    constructor() {
        setInterval(() => this.load(), RELOAD_INTERVAL_MS);
    }

    async load({local} = {local: false}) {
        const loadDarkSites = async () => {
            let $sites: string;
            const loadLocal = async () => $sites = await readText({url: CONFIG_URLs.darkSites.local});
            if (local) {
                await loadLocal();
            } else {
                try {
                    $sites = await readText({
                        url: CONFIG_URLs.darkSites.remote,
                        timeout: REMOTE_TIMEOUT_MS
                    });
                } catch (err) {
                    console.error('Dark Sites remote load error', err);
                    await loadLocal();
                }
            }
            const sites = parseArray($sites);
            this.handleDarkSites(sites)
        };

        const loadDynamicThemeFixes = async () => {
            let $fixes: string;
            const loadLocal = async () => $fixes = await readText({url: CONFIG_URLs.dynamicThemeFixes.local});
            if (local) {
                await loadLocal();
            } else {
                try {
                    $fixes = await readText({
                        url: CONFIG_URLs.dynamicThemeFixes.remote,
                        timeout: REMOTE_TIMEOUT_MS
                    });
                } catch (err) {
                    console.error('Dynamic Theme Fixes remote load error', err);
                    await loadLocal();
                }
            }
            this.RAW_DYNAMIC_THEME_FIXES = $fixes;
            this.handleDynamicThemeFixes($fixes);
        };

        const loadInversionFixes = async () => {
            let $fixes: string;
            const loadLocal = async () => $fixes = await readText({url: CONFIG_URLs.inversionFixes.local});
            if (local) {
                await loadLocal();
            } else {
                try {
                    $fixes = await readText({
                        url: CONFIG_URLs.inversionFixes.remote,
                        timeout: REMOTE_TIMEOUT_MS
                    });
                } catch (err) {
                    console.error('Inversion Fixes remote load error', err);
                    $fixes = await readText({url: CONFIG_URLs.inversionFixes.local});
                }
            }
            this.RAW_INVERSION_FIXES = $fixes;
            this.handleInversionFixes($fixes);
        };

        const loadStaticThemes = async () => {
            let $themes: string;
            const loadLocal = async () => $themes = await readText({url: CONFIG_URLs.staticThemes.local});
            if (local) {
                await loadLocal();
            } else {
                try {
                    $themes = await readText({
                        url: CONFIG_URLs.staticThemes.remote,
                        timeout: REMOTE_TIMEOUT_MS
                    });
                } catch (err) {
                    console.error('Static Theme remote load error', err);
                    await loadLocal();
                }
            }
            this.RAW_STATIC_THEMES = $themes;
            this.handleStaticThemes($themes);
        };

        await Promise.all([
            loadDarkSites(),
            loadDynamicThemeFixes(),
            loadInversionFixes(),
            loadStaticThemes(),
        ]).catch((err) => console.error('Fatality', err));
    }

    handleDynamicThemeFixes($fixes: string) {
        this.DYNAMIC_THEME_FIXES = parseDynamicThemeFixes($fixes);
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
