module DarkReader.Generation {

    /**
     * Defines a CSS generator which provides CSS for subsequent html-document processing.
     */
    export interface ICssGenerator<TConfig> {
        /**
         * Generates CSS code.
         * @param config Generator configuration.
         */
        createCssCode(config: TConfig): string;

        /**
         * Generates CSS code for specific web-site.
         * @param url Web-site address.
         * @param config Generator configuration.
         */
        createSpecialCssCode(url: string, config: TConfig): string;
    }
}