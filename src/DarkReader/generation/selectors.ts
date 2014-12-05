module DarkReader.Generation {

    export interface ContrarySelectors {
        commonSelectors: string;
        specials: UrlSelectors[];
    }

    export interface UrlSelectors {
        urlPattern: string;
        selectors: string;
    }

    /**
     * Static contrary selectors dictionary.
     */
    export var contrarySelectors = readJsonSync<UrlSelectors>('contrary.json');

    /**
     * Returns selectors, configured for given URL.
     * @param url If no matches found, common selectors will be used.
     */
    export function getSelectorsFor(url: string): string {
        var found: UrlSelectors;
        if (url) {
            // Search for match with given URL
            this.contrarySelectors.specials.forEach((s) => {
                var matches = url.match(new RegExp(s.urlPattern, 'i'));
                if (matches && matches.length > 0) {
                    found = s;
                }
            });
            if (found)
                console.log('url matches ' + found.urlPattern);
        }
        return found ?
            found.selectors
            : this.contrarySelectors.commonSelectors
    }
}