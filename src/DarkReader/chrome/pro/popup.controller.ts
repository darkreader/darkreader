module DarkReader.Chrome.Pro.Popup {
    /**
     * Pop-up page controller.
     */
    export class PopupController {

        private currentConfig: Generation.FilterConfig;

        /**
         * Creates pop-up controller.
         * @param app Chrome extension that manages filter configuration.
         */
        constructor(private app: Application<Generation.FilterConfig>) {
            this.initControls();

            this.subscriptions = [];
            this.registerEventsHandlers();

            // Before window closed -> unregister handlers.
            window.onbeforeunload = (e) => {
                this.unregisterEventsHandlers();
            };

            // Set values for the first time
            this.app.onToggle.invoke(this.app.isEnabled);
            this.app.onConfigSetup.invoke(this.app.config);
        }


        //-------------------
        // EVENT REGISTRATION
        //-------------------

        private subscriptions: Subscription<any>[];

        /**
         * Registers events handlers.
         */
        private registerEventsHandlers() {

            //------------------------
            // From background to view  <---
            //------------------------

            // On toggle
            this.subscriptions.push(this.app.onToggle.addHandler(isOn => {
                this.toggleApp.toggle.isOn = isOn;
            }, this));

            // On config setup
            this.subscriptions.push(this.app.onConfigSetup.addHandler((cfg) => {
                this.currentConfig = cfg;

                // Set controls values
                this.toggleMode.toggle.isOn = !!cfg.mode; // Attention, enum.
                this.updownBrightness.trackBar.value = cfg.brightness - 50;
                this.updownContrast.trackBar.value = cfg.contrast - 50;
                this.updownGrayscale.trackBar.value = cfg.grayscale;
                this.updownSepia.trackBar.value = cfg.sepia;
                this.fontSet.isFontUsed = cfg.usefont;
                this.fontSet.fontFamily = cfg.fontfamily;
                this.updownTextStroke.trackBar.value = cfg.textstroke * 100;
            }, this));


            //------------------------
            // From view to background  --->
            //------------------------

            // App toggle
            this.toggleApp.toggle.onUserToggle.addHandler((isOn) => {
                if (isOn) {
                    this.app.enable();
                }
                else {
                    this.app.disable();
                }
            }, this);

            // Mode toggle
            this.toggleMode.toggle.onUserToggle.addHandler((isOn) => {
                this.currentConfig.mode = isOn ?
                Generation.FilterMode.dark
                : Generation.FilterMode.light
                this.app.config = this.currentConfig;
            }, this);

            // Brightness
            this.updownBrightness.trackBar.onUserSetValue.addHandler(value => {
                this.currentConfig.brightness = value + 50;
                this.app.config = this.currentConfig;
            }, this);

            // Contrast
            this.updownContrast.trackBar.onUserSetValue.addHandler(value => {
                this.currentConfig.contrast = value + 50;
                this.app.config = this.currentConfig;
            }, this);

            // Grayscale
            this.updownGrayscale.trackBar.onUserSetValue.addHandler(value => {
                this.currentConfig.grayscale = value;
                this.app.config = this.currentConfig;
            }, this);

            // Sepia
            this.updownSepia.trackBar.onUserSetValue.addHandler(value => {
                this.currentConfig.sepia = value;
                this.app.config = this.currentConfig;
            }, this);

            // Use font
            this.fontSet.onUserCheckChange.addHandler(value => {
                this.currentConfig.usefont = value;
                this.app.config = this.currentConfig;
            }, this);

            // Font family
            this.fontSet.onUserTextChange.addHandler(value => {
                this.currentConfig.fontfamily = value;
                this.app.config = this.currentConfig;
            }, this);

            // Text stroke
            this.updownTextStroke.trackBar.onUserSetValue.addHandler(value => {
                this.currentConfig.textstroke = value / 100;
                this.app.config = this.currentConfig;
            }, this);
        }

        /**
         * Unregisters events handlers.
         */
        private unregisterEventsHandlers() {
            this.subscriptions.forEach((s) => {
                s.event.removeHandler(s.handler);
            });
        }


        //---------
        // CONTROLS
        //---------

        toggleApp: ToggleWithStatus;
        toggleMode: ToggleWithButtons;
        updownBrightness: UpDown;
        updownContrast: UpDown;
        updownGrayscale: UpDown;
        updownSepia: UpDown;
        fontSet: FontSet;
        updownTextStroke: UpDown;

        private initControls() {
            this.toggleApp = new ToggleWithStatus('toggle-app');

            this.toggleMode = new ToggleWithButtons('toggle-mode');

            this.updownBrightness = new UpDown('updown-brightness');
            this.updownBrightness.trackBar.onUserSetValue.addHandler(v => {
                this.updownBrightness.status.message =
                (v > 50 ? '+' + v.toString()
                : v < 50 ? v.toString()
                : 'off');
            }, this);

            this.updownContrast = new UpDown('updown-contrast');
            this.updownContrast.trackBar.onUserSetValue.addHandler(v => {
                this.updownContrast.status.message =
                (v > 50 ? '+' + v.toString()
                : v < 50 ? v.toString()
                : 'off');
            }, this);

            this.updownGrayscale = new UpDown('updown-grayscale');
            this.updownGrayscale.trackBar.onUserSetValue.addHandler(v => {
                this.updownGrayscale.status.message = v > 0 ? '+' + v.toString() : 'off';
            }, this);

            this.updownSepia = new UpDown('updown-sepia');
            this.updownSepia.trackBar.onUserSetValue.addHandler(v => {
                this.updownSepia.status.message = v > 0 ? '+' + v.toString() : 'off';
            }, this);

            this.fontSet = new FontSet('control-usefont');

            this.updownTextStroke = new UpDown('updown-textstroke');
            this.updownTextStroke.trackBar.onUserSetValue.addHandler(v => {
                this.updownTextStroke.status.message = v > 0 ? '+' + (v / 100).toString() : 'off';
            }, this);
        }
    }
} 