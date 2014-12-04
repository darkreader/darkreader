module DarkReader.Generation {

    /**
     * Defines a CSS generator which provides CSS for subsequent html-document processing.
     */
    export interface ICssGenerator<TConfig> {
        /**
         * Generates CSS code.
         * @param config Generator configuration.
         * @param [url] Web-site address. If not specified than common rule will be used.
         */
        createCssCode(config: TConfig, url: string): string;
    }
}