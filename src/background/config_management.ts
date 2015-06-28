/// <reference path="../typings/refs.d.ts"/>

module DarkReader {

    //--------------------------------
    //
    //      CONFIGURATION LOADING
    //
    //--------------------------------

    // TODO: Asynchronous first remote load?

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

    /**
     * List of sites with dark theme (whick should not be inverted).
     */
    export var DARK_SITES = loadConfigWithFallbackSync<string[]>({
        remoteUrl: CONFIG_URLs.darkSites.remote,
        localUrl: CONFIG_URLs.darkSites.local
    }).sort(urlTemplateSorter);

    /**
     * Fixes for specific sites (selectors which should not be inverted).
     */
    export var SITES_FIXES = (() => {
        var result = loadConfigWithFallbackSync<SitesFixes>({
            remoteUrl: CONFIG_URLs.sitesFixes.remote,
            localUrl: CONFIG_URLs.sitesFixes.local
        });
        // Replace "{common}" with common selectors
        result.specials.forEach((s) => {
            s.selectors = s.selectors.replace(
                /\{common\}/ig,
                result.commonSelectors);
        });
        return result;
    })();

    //
    // ----- Reload configs every hour ------

    setInterval(() => {
        readJson<string[]>({
            url: CONFIG_URLs.darkSites.remote,
            async: true,
            onSuccess: (result) => DARK_SITES = result.sort(urlTemplateSorter),
            onFailure: (error) => console.warn('Dark Sites load error: ' + error)
        });
        readJson<SitesFixes>({
            url: CONFIG_URLs.sitesFixes.remote,
            async: true,
            onSuccess: (result) => {
                // Replace "{common}" with common selectors
                result.specials.forEach((s) => {
                    s.selectors = s.selectors.replace(
                        /\{common\}/ig,
                        result.commonSelectors);
                });
                SITES_FIXES = result;
            },
            onFailure: (error) => console.warn('Sites Fixes load error: ' + error)
        });
    }, 60 * 60 * 1000);

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
     * Loads config from remote source
     * or from local on error (synchronous).
     */
    function loadConfigWithFallbackSync<T>(opts: {
        remoteUrl: string;
        localUrl: string;
    }) {
        var data: T;

        // Load remote config
        readJson<T>({
            url: opts.remoteUrl,
            async: false,
            onSuccess: (result) => data = result,
            // On failure load local config
            onFailure: (error) => readJson<T>({
                url: opts.localUrl,
                async: false,
                onSuccess: (result) => {
                    data = result;
                    console.warn('Loaded local config. Remote error: ' + error);
                }
            })
        });

        return data;
    }

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
                    params.onSuccess(JSON.parse(resultText));
                }
                else {
                    var error = new Error(xobj.status + ': ' + xobj.statusText);
                    onError(error);
                }
            }
        };
        xobj.onerror = (err) => onError((<any>err).error);

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