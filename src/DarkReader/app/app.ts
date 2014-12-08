module DarkReader {

    /**
     * Defines toggleable and configurable application.
     */
    export class Application<TConfig> {

        protected _config: TConfig;
        protected _isEnabled = false;

        /**
         * Creates an application.
         * @param config Default application configuration.
         */
        constructor(config: TConfig) {
            this.config = config;
        }


        //---------------------
        // App state management
        //---------------------

        /**
         * Gets app state.
         */
        get isEnabled() { return this._isEnabled; }

        /**
         * Enables application.
         */
        enable() {
            if (!this.isEnabled) {
                this.toggle();
            }
        }

        /**
         * Disables application.
         */
        disable() {
            if (this.isEnabled) {
                this.toggle();
            }
        }

        /**
         * Toggles application state.
         */
        toggle() {
            this._isEnabled = !this._isEnabled;
            this.onToggle.invoke(this._isEnabled);
        }

        /**
         * Event which fires on app state change.
         */
        onToggle = new Event<boolean>();


        //-----------------------------------
        // Generator configuration management
        //-----------------------------------

        /**
         * Gets or sets generator configuration.
         */
        get config() { return this._config; }
        set config(config: TConfig) {
            this._config = config;
            if (this.isEnabled) {
                this.onConfigSetup.invoke(config);
            }
        }

        /**
         * Event which fires on configuration setup.
         */
        onConfigSetup = new Event<TConfig>();
    }

    /**
     * Defines application configuration store.
     */
    export interface AppConfigStore<TConfig> {
        enabled: boolean;
        config: TConfig;
    }
}