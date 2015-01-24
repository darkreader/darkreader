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

        readJson<ContrarySelectors>({
            url: 'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/DarkReader/generation/contrary.json',
            async: false,
            onSuccess: (result) => selectors = result,
            onFailure: (error) => readJson<ContrarySelectors>({
                url: 'contrary.json',
                async: false,
                onSuccess: (result) => {
                    selectors = result;
                    console.log('Loaded local contrary selectors. Remote error: ' + error);
                }
            })
        });
        //selectors = readJsonSync<ContrarySelectors>('contrary.json')

        // Replace "{common}" with common selectors
        selectors.specials.forEach((s) => {
            s.selectors = s.selectors.replace(
                /\{common\}/ig,
                selectors.commonSelectors);
        });

        // Sort
        selectors.specials.sort(urlTemplateSorter);

        return selectors;
    })();
}