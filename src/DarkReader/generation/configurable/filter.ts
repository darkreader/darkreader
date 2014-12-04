module DarkReader.Generation {

    export interface FilterConfig {
        mode: FilterMode;
        brightness: number;
        contrast: number;
        grayscale: number;
        sepia: number;
        usefont: boolean;
        fontfamily: string;
        textstroke: number;
    }

    export enum FilterMode {
        light,
        dark
    }

    /**
     * Provides configurable CSS-generator based on CSS-filters.
     * It creates rule to invert a whole page and creates another rule to revert specific blocks back.
     */
    export class FilterCssGenerator implements ICssGenerator<FilterConfig> {

        protected contrarySelectors: ContrarySelectors;

        /**
         * Creates configurable CSS-generator based on CSS-filters.
         * @param prefix Vendor prefix ('-webkit-', '-moz-' etc).
         */
        constructor(public prefix: string) {
            // Load contrary selectors
            // TODO: Sync?
            parseJsonFile('contrary.json', (result: ContrarySelectors, err) => {
                if (err) throw err;
                this.contrarySelectors = result;
            });
        }

        /**
         * Generates CSS code.
         * @param config Generator configuration.
         * @param [url] Web-site address. If not specified than common contrary selectors will be used.
         */
        createCssCode(config: FilterConfig, url: string): string {
            console.log('css for url: ' + url);
            var selectors = this.getSelectors(url);
            var parts: string[] = [];
            parts.push('html', this.createLeadingDeclaration(config));
            if (config.mode === FilterMode.dark)
                parts.push(selectors, this.createContraryDeclaration(config));
            if (config.usefont)
                parts.push('*', this.createTextDeclaration(config));
            return parts.join(' ');
        }


        //-----------------
        // CSS Declarations
        //-----------------

        protected createLeadingDeclaration(config: FilterConfig): string {
            var result = '{ ' + this.prefix + 'filter: ';

            if (config.mode === FilterMode.dark)
                result += 'invert(100%) hue-rotate(180deg) ';

            result += config.contrast == 100 ? ''
            : 'contrast(' + config.contrast + '%) ';

            result += config.grayscale == 0 ? ''
            : 'grayscale(' + config.grayscale + '%) ';

            result += config.sepia == 0 ? ''
            : 'sepia(' + config.sepia + '%) ';

            result += config.brightness == 100 ? ''
            : 'brightness(' + config.brightness + '%) ';

            result += '!important; }';

            return result;
        }

        // Should be used in 'dark mode' only
        protected createContraryDeclaration(config: FilterConfig): string {
            var result = '{ ' + this.prefix + 'filter: ';

            // Less/more brightness for inverted items
            result += config.brightness == 100 ? ''
            : 'brightness(' + (200 - config.brightness) + '%) ';

            result += 'invert(100%) hue-rotate(180deg) ';

            result += '!important; }';

            return result;
        }

        // Should be used only if 'usefont' is 'true'
        protected createTextDeclaration(config: FilterConfig): string {
            var result = '{ ';

            // TODO: Validate...
            result += !config.fontfamily ? ''
            : 'font-family: '
            + config.fontfamily
            + '!important; ';

            result += config.textstroke == 0 ? ''
            : this.prefix + 'text-stroke: '
            + config.textstroke
            + '!important; ';

            result += '}';

            return result;
        }

        /**
         * Returns selectors, configured for given URL.
         * @param [url] If not specified, common selectors will be used.
         */
        protected getSelectors(url?: string): string {
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
} 