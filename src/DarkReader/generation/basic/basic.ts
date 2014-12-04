module DarkReader.Generation {
    /**
     * Provides a simple CSS generator with static configuration.
     * It uses rule to invert a whole page and uses another rule to revert specific blocks back.
     */
    export /*sealed*/ class BasicCssGenerator implements ICssGenerator<{}> {

        private contrarySelectors: ContrarySelectors;
        private leadingRule: string;
        private contraryRule: string;

        constructor() {
            // Load rules and contrary selectors
            // TODO: Sync?
            parseJsonFile('contrary.json', (result: ContrarySelectors, err) => {
                if (err) throw err;
                this.contrarySelectors = result;
            });
            parseJsonFile('rules.json', (result: CssRules, err) => {
                var rules = result;
                this.leadingRule = rules.leadingRule;
                this.contraryRule = rules.contraryRule;
            });
        }

        /**
         * Generates css code.
         * @param [config] Empty object (no config is used).
         * @param [url] Web-site address.
         */
        createCssCode(config: {}, url: string): string {
            console.log('css for url: ' + url);
            var found: UrlSelectors;
            if (url) {
                // Search for match with given URL
                this.contrarySelectors.specials.forEach((s) => {
                    var matches = url.match(new RegExp(s.urlPattern, 'i'));
                    if (matches && matches.length > 0) {
                        found = s;
                    }
                });
            }
            return [
                'html',
                this.leadingRule,
                found ? found.selectors : this.contrarySelectors.commonSelectors,
                this.contraryRule
            ].join(' ');
        }
    }

    /**
     * Loads and parses JSON from file to object.
     * 
     */
    function parseJsonFile<T>(url: string, callback: (result: T, error) => void) {
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', url, true);
        xobj.onreadystatechange = () => {
            if (xobj.readyState == 4 && xobj.status == 200) {
                callback(JSON.parse(xobj.responseText), null);
            }
        };
        xobj.onerror = (err) => {
            callback(null, err.error);
        };
        xobj.send(null);
    }

    interface ContrarySelectors {
        commonSelectors: string;
        specials: UrlSelectors[];
    }

    interface UrlSelectors {
        urlPattern: string;
        selectors: string;
    }

    interface CssRules {
        leadingRule: string;
        contraryRule: string;
    }
}