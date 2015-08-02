/// <reference path="../typings/refs.d.ts"/>

module DarkReader {

    export interface FilterConfig {
        mode: FilterMode;
        brightness: number;
        contrast: number;
        grayscale: number;
        sepia: number;
        useFont: boolean;
        fontFamily: string;
        textStroke: number;
        siteList: string[];
        invertListed: boolean;
        
        // OBSOLETE
        //usefont: boolean;
        //fontfamily: string;
        //textstroke: number;
        //ignorelist: string[];
    }

    export interface ObsoleteFilterConfig {
        usefont: boolean;
        fontfamily: string;
        textstroke: number;
        ignorelist: string[];
    }

    export enum FilterMode {
        light = 0,
        dark = 1
    }

    export var DEFAULT_FILTER_CONFIG: DarkReader.FilterConfig = {
        mode: DarkReader.FilterMode.dark,
        brightness: 110,
        contrast: 80,
        grayscale: 30,
        sepia: 10,
        useFont: false,
        fontFamily: 'Segoe UI',
        textStroke: 0,
        siteList: [],
        invertListed: false
    };

    /**
     * Configurable CSS-generator based on CSS-filters.
     * It creates rule to invert a whole page and creates another rule to revert specific blocks back.
     */
    export class FilterCssGenerator {

        /**
         * Creates configurable CSS-generator based on CSS-filters.
         */
        constructor() {
            // Detect Chromium issue 501582
            var m = navigator.userAgent.toLowerCase().match(/chrom[e|ium]\/([^ ]+)/);
            if (m && m[1]) {
                var chromeVersion = m[1];
                if (chromeVersion >= '45.0.2431.0') {
                    this.issue501582 = true;
                }
            }
        }

        issue501582: boolean;

        /**
         * Generates CSS code.
         * @param config Generator configuration.
         * @param url Web-site address.
         */
        createCssCode(config: FilterConfig, url: string): string {
            var isUrlInDarkList = isUrlInList(url, DARK_SITES);
            var isUrlInUserList = isUrlInList(url, config.siteList);

            if ((isUrlInUserList && config.invertListed)
                || (!isUrlInDarkList
                    && !config.invertListed
                    && !isUrlInUserList)
                ) {
                console.log('Creating CSS for url: ' + url);

                // Search for custom fix
                var fix = getFixesFor(url);
                
                //
                // Combine CSS

                var parts: string[] = [];

                // Add leading rule.
                parts.push('html ' + this.createLeadingDeclaration(config));

                if (config.mode === FilterMode.dark)
                    // Add contrary rule
                    if (fix.selectors) {
                        parts.push(fix.selectors + ' ' + this.createContraryDeclaration(config));
                    }

                if (config.useFont || config.textStroke > 0)
                    // Add text rule
                    parts.push('* ' + this.createTextDeclaration(config));

                // Full screen fix
                parts.push('*:-webkit-full-screen { -webkit-filter: none !important; }');

                // --- WARNING! HACK! ---
                if (config.mode === FilterMode.dark && this.issue501582) {
                    // Chrome 45 temp <html> background fix
                    // https://code.google.com/p/chromium/issues/detail?id=501582
                    parts.push('html { background: inherit !important; }');
                }

                if (fix.rules) {
                    parts.push(fix.rules);
                }

                // TODO: Formatting for readability.
                return parts.join('\\n');
            }

            // Site is not inverted
            console.log('Site is not inverted: ' + url);
            return '';
        }


        //-----------------
        // CSS Declarations
        //-----------------

        protected createLeadingDeclaration(config: FilterConfig): string {
            var result = '{ -webkit-filter: ';

            if (config.mode === FilterMode.dark)
                result += 'invert(100%) hue-rotate(180deg) ';

            result += config.brightness == 100 ? ''
                : 'brightness(' + config.brightness + '%) ';

            result += config.contrast == 100 ? ''
                : 'contrast(' + config.contrast + '%) ';

            result += config.grayscale == 0 ? ''
                : 'grayscale(' + config.grayscale + '%) ';

            result += config.sepia == 0 ? ''
                : 'sepia(' + config.sepia + '%) ';

            result += '!important; min-height: 100% !important; }';

            return result;
        }

        // Should be used in 'dark mode' only
        protected createContraryDeclaration(config: FilterConfig): string {
            var result = '{ -webkit-filter: ';

            // Less/more brightness for inverted items
            result += 'brightness(' + (config.brightness - 20) + '%) ';

            result += 'invert(100%) hue-rotate(180deg) ';

            result += '!important; }';

            return result;
        }

        // Should be used only if 'usefont' is 'true' or 'stroke' > 0
        protected createTextDeclaration(config: FilterConfig): string {
            var result = '{ ';

            if (config.useFont) {
                // TODO: Validate...
                result += !config.fontFamily ? ''
                    : 'font-family: '
                    + config.fontFamily + ' '
                    + '!important; ';
            }

            if (config.textStroke > 0) {
                result += config.textStroke == 0 ? ''
                    : '-webkit-text-stroke: '
                    + config.textStroke + 'px '
                    + '!important; ';
            }

            result += '}';

            return result;
        }
    }
} 