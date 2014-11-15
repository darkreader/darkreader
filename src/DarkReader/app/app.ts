module DarkReader {
    /**
     * Defines switchable application.
     */
    export class Application<TConfig> {

        protected _config: TConfig;
        protected _isEnabled = false;

        /**
         * Creates an application.
         * @param config Application configuration.
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
                this.switch();
            }
        }

        /**
         * Disables application.
         */
        disable() {
            if (this.isEnabled) {
                this.switch();
            }
        }

        /**
         *  Switches application state.
         */
        switch() {
            this._isEnabled = !this._isEnabled;
            this.onSwitch.invoke(this._isEnabled);
        }

        /**
         * Event which fires on app state change.
         */
        onSwitch = new Event<boolean>();


        //-----------------------------------
        // Generator configuration management
        //-----------------------------------

        /**
         * Gets or sets generator configuration.
         */
        get config() { return this.config; }
        set config(config: TConfig) {
            this._config = config;
            if (this._isEnabled) {
                this.onConfigSetup.invoke(config);
            }
        }

        /**
         * Event which fires on configuration setup.
         */
        onConfigSetup = new Event<TConfig>();
    }
}