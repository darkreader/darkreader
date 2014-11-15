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
            this.contrarySelectors = <ContrarySelectors>parseJsonFile('contrary.json');
            var rules = <CssRules>parseJsonFile('rules.json');
            this.leadingRule = rules.leadingRule;
            this.contraryRule = rules.contraryRule;
        }

        /**
         * Generates css code.
         */
        createCssCode(): string {
            return [
                'html',
                this.leadingRule,
                this.contrarySelectors.commonSelectors,
                this.contraryRule
            ].join(' ');
        }

        /**
         * Generates css code for specific web-site.
         * @param url Web-site address.
         */
        createSpecialCssCode(url: string): string {
            //console.log('cs: ' + this._counterSelectors);
            var found: UrlSelectors;
            this.contrarySelectors.specials.forEach((s) => {
                var matches = url.match(new RegExp(s.urlPattern, 'i'));
                if (matches && matches.length > 0) {
                    found = s;
                }
            });
            if (!found) {
                return null;
            }
            //console.log('matched: ' + foundSelector.pattern);
            return [
                'html',
                this.leadingRule,
                found.selectors,
                this.contraryRule
            ].join(' ');
        }
    }

    function parseJsonFile<T>(url: string): T {
        var result = null;
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', url, true);
        xobj.onreadystatechange = () => {
            if (xobj.readyState == 4 && xobj.status == 200) {
                result = JSON.parse(xobj.responseText).selectors;
            }
        };
        xobj.send(null);
        return result;
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