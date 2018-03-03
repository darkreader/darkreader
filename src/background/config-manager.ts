import {simpleClone} from './utils';
import {FilterConfig, InversionFixes, InversionFix, SiteFix} from '../definitions';

export const configStore: {
    DEFAULT_FILTER_CONFIG?: FilterConfig;
    DARK_SITES?: string[];
    INVERSION_FIXES?: InversionFixes;
    RAW_INVERSION_FIXES?: any;
    DEBUG?: boolean;
} = {};

//--------------------------------
//
//      CONFIGURATION LOADING
//
//--------------------------------

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

configStore.DEBUG = [
    'eimadpbcbfnmbkopoojfekhnkhdbieeh',
    'addon@darkreader.org'
].indexOf(chrome.runtime.id) < 0;
const DEBUG_LOCAL_CONFIGS = false;

//
// ----- Load configs ------

export async function loadConfigs() {
    async function loadLocalDarkSites() {
        return await readJson<string[]>({url: CONFIG_URLs.darkSites.local});
    }

    async function loadLocalInversionFixes() {
        return await readJson<InversionFixes>({url: CONFIG_URLs.inversionFixes.local});
    }

    async function loadDefaultFilterConfig() {
        const filter = await readJson<FilterConfig>({url: CONFIG_URLs.defaultFilterConfig.local});
        handleFilterConfig(filter);
    }

    async function loadDarkSites() {
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
        handleDarkSites($sites)
    }

    async function loadInversionFixes() {
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
        configStore.RAW_INVERSION_FIXES = simpleClone($fixes);
        handleInversionFixes($fixes);
    }

    await Promise.all([
        loadDarkSites(),
        loadInversionFixes(),
        loadDefaultFilterConfig(),
    ]).catch((err) => console.error('Fatality', err));
}

function handleDarkSites(sites: string[]) {
    configStore.DARK_SITES = (Array.isArray(sites) ? sites : [])
        .filter((x) => typeof x === 'string')
        .sort(urlTemplateSorter);
}

export function handleInversionFixes($fixes: InversionFixes) {
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
        : []);
    configStore.INVERSION_FIXES = {
        common,
        sites,
    };
}

function handleFilterConfig(config: FilterConfig) {
    const {DEFAULT_FILTER_CONFIG} = configStore;
    if (config !== null && typeof config === 'object') {
        for (let prop in DEFAULT_FILTER_CONFIG) {
            if (typeof config[prop] !== typeof DEFAULT_FILTER_CONFIG[prop]) {
                config[prop] = DEFAULT_FILTER_CONFIG[prop];
            }
        }
        configStore.DEFAULT_FILTER_CONFIG = config;
    }
}

setInterval(loadConfigs, RELOAD_INTERVAL_MS); // Reload periodically

/**
 * Returns fixes for a given URL.
 * If no matches found, common fixes will be returned.
 * @param url Site URL.
 */
export function getFixesFor(url: string): InversionFix {
    const {INVERSION_FIXES} = configStore;
    let found: SiteFix;
    if (url) {
        // Search for match with given URL
        loop: for (let i = 0; i < INVERSION_FIXES.sites.length; i++) {
            let s = INVERSION_FIXES.sites[i];
            let urls: string[] = typeof s.url === 'string' ? [<string>s.url] : <string[]>s.url;
            for (let j = 0; j < urls.length; j++) {
                if (isUrlMatched(url, urls[j])) {
                    found = s;
                    break loop;
                }
            }
        }
        if (found) {
            console.log('URL matches ' + found.url);
        }
    }
    return (found ?
        found :
        {
            invert: INVERSION_FIXES.common.invert,
            noinvert: INVERSION_FIXES.common.noinvert,
            removebg: INVERSION_FIXES.common.removebg,
            rules: INVERSION_FIXES.common.rules
        }
    );
}


//------------------
//
//     HELPERS
//
//------------------

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
            params.url + '?nocache=' + new Date().getTime(),
            true
        );
        request.onload = () => {
            if (request.status >= 200 && request.status < 300) {
                // Remove comments
                const resultText = request.responseText
                    .replace(/(\".*?(\\\".*?)*?\")|(\/\*(.|[\r\n])*?\*\/)|(\/\/.*?[\r\n])/gm, '$1');

                const json = JSON.parse(resultText);
                resolve(json);
            }
            else {
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
    }
    else {
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

/**
 * URL template sorter.
 */
export const urlTemplateSorter = ($a: {url?: string} | string, $b: {url?: string} | string) => {
    const a = typeof $a === 'string' ? $a : $a.url;
    const b = typeof $b === 'string' ? $b : $b.url;
    const slashIndexA = a.indexOf('/');
    const slashIndexB = b.indexOf('/');
    const addressA = a.replace('^', '').substring(0, slashIndexA);
    const addressB = b.replace('^', '').substring(0, slashIndexB);
    const reverseA = addressA.split('.').reverse().join('.').toLowerCase(); // com.google
    const reverseB = addressB.split('.').reverse().join('.').toLowerCase(); // *.google

    // Sort by reversed address descending
    if (reverseA > reverseB) {
        return -1;
    }
    else if (reverseA < reverseB) {
        return 1;
    }
    else {
        // Then sort by path descending
        const pathA = a.substring(slashIndexA);
        const pathB = b.substring(slashIndexB);
        return -pathA.localeCompare(pathB);
    }
};

function joinLines(lines: string | string[], separator = ''): string {
    if (typeof lines === 'string') {
        return lines;
    }
    return (<string[]>lines).join(separator + '\\n');
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
