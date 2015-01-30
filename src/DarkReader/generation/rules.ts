module DarkReader.Generation {

    export interface UrlRule {
        url: string;
        rule: string;
    }

    /**
     * Returns CSS-rule, configured for given URL.
     * @param url If no matches found, common selectors will be used.
     */
    export function getRuleFor(url: string) {
        var found: UrlRule;
        if (url) {
            // Search for match with given URL
            rules.forEach((r) => {
                if (isUrlMatched(url, r.url)) {
                    found = r;
                }
            });
            if (found)
                console.log('url matches ' + found.url);
        }
        return found ? found.rule : null;
    }

    /**
     * Static CSS-rule dictionary.
     */
    export var rules = (function () {
        var rules: UrlRule[];

        readJson<UrlRule[]>({
            url: 'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/DarkReader/generation/rules.json',
            async: false,
            onSuccess: (result) => rules = result,
            onFailure: (error) => readJson<UrlRule[]>({
                url: 'rules.json',
                async: false,
                onSuccess: (result) => {
                    rules = result;
                    console.log('Loaded local CSS-rules. Remote error: ' + error);
                }
            })
        });
        //rules = readJsonSync<ContrarySelectors>('rules.json')

        // Sort
        rules.sort(urlTemplateSorter);

        return rules;
    })();
}