import {readText} from './utils/network';
import {parseArray} from '../utils/text';
import {getDuration} from '../utils/time';
import {parseInversionFixes} from '../generators/css-filter';
import {parseDynamicThemeFixes} from '../generators/dynamic-theme';
import {InversionFix, StaticTheme, DynamicThemeFix} from '../definitions';

const remoteConfigDir = 'https://raw.githubusercontent.com/darkreader/darkreader/master/src/config/';
const localConfigDir = '../config/';

const remoteStaticThemesDir = 'https://raw.githubusercontent.com/darkreader/darkreader/master/src/static-themes/';
const localStaticThemesDir = '../static-themes/';

const configFiles = {
    darkSites: 'dark-sites.config',
    dynamicThemeFixes: 'dynamic-theme-fixes.config',
    inversionFixes: 'inversion-fixes.config',
};

const staticThemesFiles = [
    {url: ['*'], file: 'global.css'},
    {url: ['www.google.*', 'www.google.*.*'], file: 'google.css'},
];

const REMOTE_TIMEOUT_MS = getDuration({seconds: 10});

export default class ConfigManager {
    DARK_SITES?: string[];
    DYNAMIC_THEME_FIXES?: DynamicThemeFix[];
    INVERSION_FIXES?: InversionFix[];
    STATIC_THEMES?: StaticTheme[];

    raw = {
        darkSites: null,
        dynamicThemeFixes: null,
        inversionFixes: null,
        staticThemes: null,
    };

    overrides = {
        darkSites: null,
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
            localURL: `${localConfigDir}${configFiles.darkSites}`,
            remoteURL: `${remoteConfigDir}${configFiles.darkSites}`,
            success: ($sites: string) => {
                this.raw.darkSites = $sites;
                this.handleDarkSites();
            },
        });
    }

    private async loadDynamicThemeFixes({local}) {
        await this.loadConfig({
            name: 'Dynamic Theme Fixes',
            local,
            localURL: `${localConfigDir}${configFiles.dynamicThemeFixes}`,
            remoteURL: `${remoteConfigDir}${configFiles.dynamicThemeFixes}`,
            success: ($fixes: string) => {
                this.raw.dynamicThemeFixes = $fixes;
                this.handleDynamicThemeFixes();
            },
        });
    }

    private async loadInversionFixes({local}) {
        await this.loadConfig({
            name: 'Inversion Fixes',
            local,
            localURL: `${localConfigDir}${configFiles.inversionFixes}`,
            remoteURL: `${remoteConfigDir}${configFiles.inversionFixes}`,
            success: ($fixes: string) => {
                this.raw.inversionFixes = $fixes;
                this.handleInversionFixes();
            },
        });
    }

    private async loadStaticThemes({local}) {
        this.STATIC_THEMES = Array.from({length: staticThemesFiles.length});
        await Promise.all(staticThemesFiles.map(({url, file}, index) => {
            return this.loadConfig({
                name: `Static Theme for ${url.join(', ')}`,
                local,
                localURL: `${localStaticThemesDir}${file}`,
                remoteURL: `${remoteStaticThemesDir}${file}`,
                success: (css: string) => {
                    this.STATIC_THEMES[index] = {url, css};
                },
            });
        }));
    }

    async load(config: {local: boolean}) {
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
        this.DYNAMIC_THEME_FIXES = parseDynamicThemeFixes($fixes);
    }

    handleInversionFixes() {
        const $fixes = this.overrides.inversionFixes || this.raw.inversionFixes;
        this.INVERSION_FIXES = parseInversionFixes($fixes);
    }
}
