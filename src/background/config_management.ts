/// <reference path="../typings/refs.d.ts"/>

module DarkReader {

    //--------------------------------
    //
    //      CONFIGURATION LOADING
    //
    //--------------------------------

    var CONFIG_URLs = {
        darkSites: {
            remote: 'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/config/dark_sites.json',
            local: '../config/dark_sites.json'
        },
        sitesFixes: {
            remote: 'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/config/sites_fixes.json',
            local: '../config/sites_fixes.json'
        }
    };
    var REMOTE_TIMEOUT_MS = 10 * 1000;
    var RELOAD_INTERVAL_MS = 15 * 60 * 1000;

    /**
     * List of sites with dark theme (whick should not be inverted).
     */
    export var DARK_SITES: string[];

    /**
     * Fixes for specific sites (selectors which should not be inverted).
     */
    export var SITES_FIXES: SitesFixes;

    //
    // ----- Load configs ------
    
    export function loadConfigs(done?: () => void) {
        function onInvalidData(desc) {
            console.warn('Invalid data: ' + desc);
        }
        var loadedDarkSites = false;
        var loadedSitesFixes = false;
        var onLoadedDarkSites = function(sites: string[]) {
            // Validate sites
            if (!Array.isArray(sites)) {
                sites = [];
                onInvalidData('List is not an array.');
            }
            for (var i = sites.length - 1; i >= 0; i--) {
                if (typeof sites[i] !== 'string') {
                    sites.splice(i, 1);
                    onInvalidData('URL is not a string.');
                }
            }
            sites.sort(urlTemplateSorter);
            
            // End
            DARK_SITES = sites;
            loadedDarkSites = true;
            if (done && loadedSitesFixes) {
                done();
            }
        };
        var onLoadedSitesFixes = function(fixes: SitesFixes) {
            // Validate fixes
            if (fixes === null || typeof fixes !== 'object') {
                fixes = {
                    commonSelectors: '',
                    specials: []
                };
                onInvalidData('Fix is not an object.')
            }
            if (typeof fixes.commonSelectors !== 'string') {
                fixes.commonSelectors = '';
                onInvalidData('Missing common selectors.')
            }
            if (!Array.isArray(fixes.specials)) {
                fixes.specials = [];
                onInvalidData('Missing special selectors.');
            }
            for (var i = fixes.specials.length - 1; i >= 0; i--) {
                if (typeof fixes.specials[i].url !== 'string') {
                    fixes.specials.splice(i, 1);
                    onInvalidData('Wrong URL.');
                    continue;
                }
                if (typeof fixes.specials[i].selectors !== 'string') {
                    fixes.specials[i].selectors = fixes.commonSelectors;
                    // TODO: Optional "selectors" property.
                    onInvalidData('Missing selectors.');
                }
                if (fixes.specials[i].rules !== void 0
                    && typeof fixes.specials[i].rules !== 'string'
                    ) {
                    fixes.specials[i].rules = '';
                    onInvalidData('Rule is not a string.');
                    continue;
                }
            }
            // Sort like templates?
            
            // Replace "{common}" with common selectors
            fixes.specials.forEach((s) => {
                s.selectors = s.selectors.replace(
                    /\{common\}/ig,
                    fixes.commonSelectors);
            });
            
            // End
            SITES_FIXES = fixes;
            loadedSitesFixes = true;
            if (done && loadedDarkSites) {
                done();
            }
        };
        
        // Load start
        readJson<string[]>({
            url: CONFIG_URLs.darkSites.remote,
            async: true,
            timeout: REMOTE_TIMEOUT_MS,
            onSuccess: (result) => {
                onLoadedDarkSites(result)
            },
            onFailure: (error) => {
                console.warn('Dark Sites remote load error: ' + error);
                readJson<string[]>({
                    url: CONFIG_URLs.darkSites.local,
                    async: true,
                    onSuccess: (result) => {
                        onLoadedDarkSites(result);
                    },
                    onFailure: (error) => {
                        console.warn('Fatal sh*t, local Dark Sites were not loaded: ' + error);
                    }
                });
            }
        });
        readJson<SitesFixes>({
            url: CONFIG_URLs.sitesFixes.remote,
            async: true,
            timeout: REMOTE_TIMEOUT_MS,
            onSuccess: (result) => {
                onLoadedSitesFixes(result)
            },
            onFailure: (error) => {
                console.warn('Sites Fixes remote load error: ' + error);
                readJson<SitesFixes>({
                    url: CONFIG_URLs.sitesFixes.local,
                    async: true,
                    onSuccess: (result) => {
                        onLoadedSitesFixes(result);
                    },
                    onFailure: (error) => {
                        console.warn('Fatal sh*t, local Sites Fixes were not loaded: ' + error);
                    }
                });
            }
        });
    }

    setInterval(loadConfigs, RELOAD_INTERVAL_MS); // Reload periodically

    export interface SitesFixes {
        commonSelectors: string;
        specials: SiteFix[];
    }

    export interface SiteFix {
        url: string;
        selectors?: string;
        rules?: string;
    }

    /**
     * Returns fixes for a given URL.
     * If no matches found, common fixes will be returned.
     * @param url Site URL.
     */
    export function getFixesFor(url: string): {
        selectors?: string;
        rules?: string;
    } {
        var found: SiteFix;
        if (url) {
            // Search for match with given URL
            SITES_FIXES.specials.forEach((s) => {
                if (isUrlMatched(url, s.url)) {
                    found = s;
                }
            });
            if (found) {
                console.log('URL matches ' + found.url);
            }
        }
        return (found ?
            found
            : { selectors: SITES_FIXES.commonSelectors });
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
    function readJson<T>(params: JsonRequestParams<T>) {
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open(
            'GET',
            params.url + '?nocache=' + new Date().getTime(),
            params.async);
        xobj.onreadystatechange = () => {
            if (xobj.readyState == 4) {
                if (xobj.status == 200) {
                    // Remove comments
                    var resultText = xobj.responseText
                        .replace(/(\".*?(\\\".*?)*?\")|(\/\*(.|[\r\n])*?\*\/)|(\/\/.*?[\r\n])/gm, '$1');
                    try {
                        var json = JSON.parse(resultText);
                        params.onSuccess(json);
                    }
                    catch (e) {
                        onError(e);
                    }
                }
                else {
                    var error = new Error(xobj.status + ': ' + xobj.statusText);
                    onError(error);
                }
            }
        };
        xobj.onerror = (err) => onError((<any>err).error);
        if (params.timeout) {
            xobj.timeout = params.timeout;
            xobj.ontimeout = () => {
                var err = new Error('Config loading stopped due to timeout.');
                onError(err);
            };
        }

        try {
            xobj.send(null);
        }
        catch (e) {
            onError(e);
        }

        function onError(err: Error) {
            if (params.onFailure) {
                params.onFailure(err);
            }
            else {
                throw err;
            }
        }
    }

    interface JsonRequestParams<T> {
        url: string;
        async: boolean;
        onSuccess: (result: T) => void;
        onFailure?: (error) => void;
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
        for (var i = 0; i < list.length; i++) {
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
        var regex = createUrlRegex(urlTemplate);
        return !!url.match(regex);
    }

    function createUrlRegex(urlTemplate: string): RegExp {
        ///^(.*?\:\/\/)?.*?\.?(google\.[^\.]+?)(\/.*)?$/i
        var result = '^(.*?\\:\\/\\/)?[^\/]*?\\.?';

        // Remove protocol?
        urlTemplate = urlTemplate.replace(/^.*?\/\//, '');

        // Remove last slash
        urlTemplate = urlTemplate.replace(/\/$/, '');

        var slashIndex: number;
        var address: string;
        if ((slashIndex = urlTemplate.indexOf('/')) >= 0) {
            address = urlTemplate.substring(0, slashIndex); // google.*
            var path = urlTemplate.substring(slashIndex); // /login/abc
        }
        else {
            address = urlTemplate;
        }

        // Address group
        var addressParts = address.split('.');
        result += '(';
        for (var i = 0; i < addressParts.length; i++) {
            if (addressParts[i] === '*') {
                addressParts[i] = '[^\\.]+?';
            }
        }
        result += addressParts.join('\\.');
        result += ')';

        if (path) {
            // Path group
            result += '(';
            result += path.replace('/', "\\/");
            result += ')';
        }

        result += '(\\/.*)?$';

        var regex = new RegExp(result, 'i');
        return regex;
    }

    /**
     * URL template sorter.
     */
    export var urlTemplateSorter = (a: { url?: string }, b: { url?: string }) => {
        if (typeof a === 'string')
            a = { url: <string>a };
        if (typeof b === 'string')
            b = { url: <string>b };
        var slashIndexA = a.url.indexOf('/');
        var slashIndexB = b.url.indexOf('/');
        var addressA = a.url.substring(0, slashIndexA);
        var addressB = b.url.substring(0, slashIndexB);
        var reverseA = addressA.split('.').reverse().join('.').toLowerCase(); // com.google
        var reverseB = addressB.split('.').reverse().join('.').toLowerCase(); // *.google

        // Sort by reversed address descending
        if (reverseA > reverseB) {
            return -1;
        }
        else if (reverseA < reverseB) {
            return 1;
        }
        else {
            // Then sort by path descending
            var pathA = a.url.substring(slashIndexA);
            var pathB = b.url.substring(slashIndexB);
            return -pathA.localeCompare(pathB);
        }
    };
}