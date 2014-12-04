module DarkReader.Generation {
    /**
     * Provides a simple CSS generator with static configuration.
     * It uses rule to invert a whole page and uses another rule to revert specific blocks back.
     */
    export /*sealed*/ class BasicCssGenerator implements ICssGenerator<{}> {

        private contrarySelectors: ContrarySelectors;
        private leadingDeclaration: string;
        private contraryDeclaration: string;

        constructor() {
            // Load rules and contrary selectors
            // TODO: Sync?
            parseJsonFile('contrary.json', (result: ContrarySelectors, err) => {
                if (err) throw err;
                this.contrarySelectors = result;
            });
            parseJsonFile('declarations.json', (result: CssDeclarations, err) => {
                var decs = result;
                this.leadingDeclaration = decs.leadingDeclaration;
                this.contraryDeclaration = decs.contraryDeclaration;
            });
        }

        /**
         * Generates css code.
         * @param [config] Empty object (no config is used).
         * @param [url] Web-site address.
         */
        createCssCode(config?: {}, url?: string): string {
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
                if (found) {
                    console.log('url matches ' + found.urlPattern);
                }
            }
            return [
                'html',
                this.leadingDeclaration,
                found ? found.selectors : this.contrarySelectors.commonSelectors,
                this.contraryDeclaration
            ].join(' ');
        }
    }

    interface CssDeclarations {
        leadingDeclaration: string;
        contraryDeclaration: string;
    }
}