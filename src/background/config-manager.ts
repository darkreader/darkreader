import {simpleClone} from './utils';
import {FilterConfig, InversionFixes, InversionFix, SiteFix} from '../definitions';

const DEBUG = [
    'eimadpbcbfnmbkopoojfekhnkhdbieeh',
    'addon@darkreader.org'
].indexOf(chrome.runtime.id) < 0;
const DEBUG_LOCAL_CONFIGS = false;

const CONFIG_URLs = {
    darkSites: {
        remote: 'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/config/dark_sites.json',
        local: '../config/dark_sites.json',
    },
    inversionFixes: {
        remote: 'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/config/fix_inversion.json',
        local: '../config/fix_inversion.json',
    },
    defaultFilterConfig: {
        local: '../config/filter_config.json',
    },
};
const REMOTE_TIMEOUT_MS = 10 * 1000;
const RELOAD_INTERVAL_MS = 15 * 60 * 1000;

export default class ConfigManager {
    DEFAULT_FILTER_CONFIG?: FilterConfig;
    DARK_SITES?: string[];
    INVERSION_FIXES?: InversionFixes;
    RAW_INVERSION_FIXES?: any;
    DEBUG?: boolean;

    constructor() {
        setInterval(() => this.load(), RELOAD_INTERVAL_MS);
    }

    async load() {
        const loadLocalDarkSites = async () => {
            return await readJson<string[]>({url: CONFIG_URLs.darkSites.local});
        };

        const loadLocalInversionFixes = async () => {
            return await readJson<InversionFixes>({url: CONFIG_URLs.inversionFixes.local});
        };

        const loadDarkSites = async () => {
            let $sites: string[];
            if (DEBUG_LOCAL_CONFIGS) {
                $sites = await loadLocalDarkSites();
            } else {
                try {
                    $sites = await readJson<string[]>({
                        url: CONFIG_URLs.darkSites.remote,
                        timeout: REMOTE_TIMEOUT_MS
                    });
                } catch (err) {
                    console.error('Dark Sites remote load error', err);
                    $sites = await loadLocalDarkSites();
                }
            }
            this.handleDarkSites($sites)
        };

        const loadInversionFixes = async () => {
            let $fixes: InversionFixes;
            if (DEBUG_LOCAL_CONFIGS) {
                $fixes = await loadLocalInversionFixes();
            } else {
                try {
                    $fixes = await readJson<InversionFixes>({
                        url: CONFIG_URLs.inversionFixes.remote,
                        timeout: REMOTE_TIMEOUT_MS
                    });
                } catch (err) {
                    console.error('Inversion Fixes remote load error', err);
                    $fixes = await loadLocalInversionFixes();
                }
            }
            this.RAW_INVERSION_FIXES = simpleClone($fixes);
            this.handleInversionFixes($fixes);
        };

        if (!this.DEFAULT_FILTER_CONFIG) {
            this.DEFAULT_FILTER_CONFIG = await readJson<FilterConfig>({url: CONFIG_URLs.defaultFilterConfig.local});
        }

        await Promise.all([
            loadDarkSites(),
            loadInversionFixes(),
        ]).catch((err) => console.error('Fatality', err));
    }

    handleInversionFixes($fixes: InversionFixes) {
        const common = {
            invert: toStringArray($fixes && $fixes.common && $fixes.common.invert),
            noinvert: toStringArray($fixes && $fixes.common && $fixes.common.noinvert),
            removebg: toStringArray($fixes && $fixes.common && $fixes.common.removebg),
            rules: toStringArray($fixes && $fixes.common && $fixes.common.rules),
        };
        const sites = ($fixes && Array.isArray($fixes.sites)
            ? $fixes.sites.filter((s) => isStringOrArray(s.url))
                .map((s) => {
                    return {
                        url: s.url,
                        invert: common.invert.concat(toStringArray(s.invert)),
                        noinvert: common.noinvert.concat(toStringArray(s.noinvert)),
                        removebg: common.removebg.concat(toStringArray(s.removebg)),
                        rules: common.rules.concat(toStringArray(s.rules)),
                    };
                })
            : [])
            .reduce((flat, s) => {
                if (Array.isArray(s.url)) {
                    s.url.forEach((url) => {
                        flat.push({...s, ...{url}});
                    });
                } else {
                    flat.push(s);
                }
                return flat;
            }, []);
        this.INVERSION_FIXES = {
            common,
            sites,
        };
    }

    private handleDarkSites(sites: string[]) {
        this.DARK_SITES = (Array.isArray(sites) ? sites : [])
            .filter((x) => typeof x === 'string');
    }

    /**
     * Returns fixes for a given URL.
     * If no matches found, common fixes will be returned.
     * @param url Site URL.
     */
    getFixesFor(url: string): InversionFix {
        const {INVERSION_FIXES} = this;
        let found: SiteFix;
        if (url) {
            // Search for match with given URL
            const matches = INVERSION_FIXES.sites
                .filter((s) => isUrlMatched(url, s.url as string))
                .sort((a, b) => b.url.length - a.url.length);
            if (matches.length > 0) {
                console.log(`URL matches ${matches[0].url}`);
                return matches[0];
            }
        }
        return {...INVERSION_FIXES.common};
    }
}

//
// ---------- Data loading -----------

/**
 * Loads and parses JSON from file to object.
 * @param params Object containing request parameters.
 */
function readJson<T>(params: JsonRequestParams<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.overrideMimeType("application/json");
        request.open(
            'GET',
            `${params.url}?nocache=${Date.now()}`,
            true
        );
        request.onload = () => {
            if (request.status >= 200 && request.status < 300) {
                // Remove comments
                const resultText = request.responseText
                    .replace(/(\".*?(\\\".*?)*?\")|(\/\*(.|[\r\n])*?\*\/)|(\/\/.*?[\r\n])/gm, '$1');

                const json = JSON.parse(resultText);
                resolve(json);
            } else {
                reject(new Error(request.status + ': ' + request.statusText));
            }
        };
        request.onerror = (err: ErrorEvent) => reject(err.error);
        if (params.timeout) {
            request.timeout = params.timeout;
            request.ontimeout = () => reject(new Error('Config loading stopped due to timeout.'));
        }
        request.send();
    });
}

interface JsonRequestParams<T> {
    url: string;
    timeout?: number;
}


//
// ---------- URL template matching ----------------

/**
 * Determines whether URL has a match in URL template list.
 * @param url Site URL.
 * @paramlist List to search into.
 */
export function isUrlInList(url: string, list: string[]) {
    for (let i = 0; i < list.length; i++) {
        if (isUrlMatched(url, list[i])) {
            console.log('URL ' + url + ' is in list.');
            return true;
        }
    }
    return false;
}

/**
 * Determines whether URL matches the template.
 * @param url URL.
 * @param urlTemplate URL template ("google.*", "youtube.com" etc).
 */
function isUrlMatched(url: string, urlTemplate: string): boolean {
    const regex = createUrlRegex(urlTemplate);
    return !!url.match(regex);
}

function createUrlRegex(urlTemplate: string): RegExp {
    urlTemplate = urlTemplate.trim();
    const exactBeginning = (urlTemplate[0] === '^');
    const exactEnding = (urlTemplate[urlTemplate.length - 1] === '$');

    urlTemplate = (urlTemplate
        .replace(/^\^/, '') // Remove ^ at start
        .replace(/\$$/, '') // Remove $ at end
        .replace(/^.*?\/{2,3}/, '') // Remove scheme
        .replace(/\?.*$/, '') // Remove query
        .replace(/\/$/, '') // Remove last slash
    );

    let slashIndex: number;
    let beforeSlash: string;
    let afterSlash: string;
    if ((slashIndex = urlTemplate.indexOf('/')) >= 0) {
        beforeSlash = urlTemplate.substring(0, slashIndex); // google.*
        afterSlash = urlTemplate.replace('$', '').substring(slashIndex); // /login/abc
    } else {
        beforeSlash = urlTemplate.replace('$', '');
    }

    //
    // SCHEME and SUBDOMAINS

    let result = (exactBeginning ?
        '^(.*?\\:\\/{2,3})?' // Scheme
        : '^(.*?\\:\\/{2,3})?([^\/]*?\\.)?' // Scheme and subdomains
    );

    //
    // HOST and PORT

    const hostParts = beforeSlash.split('.');
    result += '(';
    for (let i = 0; i < hostParts.length; i++) {
        if (hostParts[i] === '*') {
            hostParts[i] = '[^\\.\\/]+?';
        }
    }
    result += hostParts.join('\\.');
    result += ')';

    //
    // PATH and QUERY

    if (afterSlash) {
        result += '(';
        result += afterSlash.replace('/', '\\/');
        result += ')';
    }

    result += (exactEnding ?
        '(\\/?(\\?[^\/]*?)?)$' // All following queries
        : '(\\/?.*?)$' // All following paths and queries
    );

    //
    // Result

    return new RegExp(result, 'i');
}

function isStringOrArray(item) {
    return (typeof item === 'string' || Array.isArray(item));
}

function toStringArray(value: string | string[]): string[] {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string' && value) {
        return [value];
    }
    return [];
}
