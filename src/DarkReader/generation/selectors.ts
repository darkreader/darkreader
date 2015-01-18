module DarkReader.Generation {

    export interface ContrarySelectors {
        commonSelectors: string;
        specials: UrlSelectors[];
    }

    export interface UrlSelectors {
        url: string;
        selectors: string;
    }

    /**
     * Returns selectors, configured for given URL.
     * @param url If no matches found, common selectors will be used.
     */
    export function getSelectorsFor(url: string): string {
        var found: UrlSelectors;
        if (url) {
            // Search for match with given URL
            contrarySelectors.specials.forEach((s) => {
                if (isUrlMatched(url, s.url)) {
                    found = s;
                }
            });
            if (found)
                console.log('url matches ' + found.url);
        }
        return found ?
            found.selectors
            : contrarySelectors.commonSelectors
    }

    /**
     * Static contrary selectors dictionary.
     */
    export var contrarySelectors = (function () {
        var selectors: ContrarySelectors;

        // Try load remote
        selectors = readJsonSync<ContrarySelectors>(
            'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/DarkReader/generation/contrary.json',
            // Load locally if error
            function (error) { selectors = readJsonSync<ContrarySelectors>('contrary.json') });

        // Sort URLs from specials ("google.com") to generics ("google.*").
        selectors.specials.sort(urlTemplateSorter);

        return selectors;
    })();
}