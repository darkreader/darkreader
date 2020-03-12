declare namespace DarkReader {
    /**
     * Enables dark mode for current web page.
     * @param theme Theme options.
     * @param fixes Fixes for the generated theme.
     */
    function enable(theme: Partial<Theme>, fixes?: DynamicThemeFix): void;

    /**
     * Disables dark mode for current web page.
     */
    function disable(): void;

    /**
     * Enables dark mode when system color scheme is dark.
     * @param theme Theme options.
     * @param fixes Fixes for the generated theme.
     */
    function auto(theme: Partial<Theme> | false, fixes?: DynamicThemeFix): void;

    /**
     * Stops watching for system color scheme.
     * @param isEnabled Boolean `false` value.
     */
    function auto(isEnabled: false): void;

    /**
     * Sets a function for making CORS requests.
     * @param fetch A fetch function.
     */
    function setFetchMethod(fetch: (url: string) => Promise<Response>): void;

    /**
     * Theme options.
     */
    interface Theme {
        /**
         * 1 - dark mode, 0 - dimmed mode.
         * Default 1.
         */
        mode: 0 | 1;
        /**
         * Brightness (0 - 100+).
         * Default 100.
         */
        brightness: number;
        /**
         * Contrast (0 - 100+).
         * Default 100.
         */
        contrast: number;
        /**
         * Grayscale (0 - 100).
         * Default 0.
         */
        grayscale: number;
        /**
         * Sepia (0 - 100).
         * Default 0.
         */
        sepia: number;
        /**
         * Specifies if custom font should be used.
         * Default false.
         */
        useFont: boolean;
        /**
         * Font family to use.
         */
        fontFamily: string;
        /**
         * Makes text look bolder (0 - 1px).
         * Default 0.
         */
        textStroke: number;
    }

    /**
     * Contains fixes for the generated theme.
     */
    interface DynamicThemeFix {
        /**
         * List of CSS selectors that should be inverted.
         * Usually icons that are contained in sprites.
         */
        invert: string[];
        /**
         * Additional CSS.
         * ${color} template should be used to apply theme options to a color.
         * Example:
         * ```
         * body {
         *     background-color: ${white} !important;
         *     background-image: none !important;
         * }
         * ```
         */
        css: string;
    }
}

declare module 'darkreader' {
    export = DarkReader;
}
