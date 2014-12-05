module DarkReader.Generation {
    /**
     * Provides a simple CSS generator with static configuration.
     * It uses rule to invert a whole page and uses another rule to revert specific blocks back.
     */
    export /*sealed*/ class BasicCssGenerator implements ICssGenerator<{}> {

        private leadingDeclaration: string;
        private contraryDeclaration: string;

        constructor() {
            // Load styles
            var decs = readJsonSync<CssDeclarations>('declarations.json');
            this.leadingDeclaration = decs.leadingDeclaration;
            this.contraryDeclaration = decs.contraryDeclaration;
        }

        /**
         * Generates css code.
         * @param [config] Empty object (no config is used).
         * @param [url] Web-site address.
         */
        createCssCode(config?: {}, url?: string): string {
            console.log('css for url: ' + url);
            return [
                'html',
                this.leadingDeclaration,
                getSelectorsFor(url),
                this.contraryDeclaration
            ].join(' ');
        }
    }

    interface CssDeclarations {
        leadingDeclaration: string;
        contraryDeclaration: string;
    }
}