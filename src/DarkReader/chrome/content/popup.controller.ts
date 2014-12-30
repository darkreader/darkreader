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

                //
                // Set controls values

                this.toggleMode.toggle.isOn = !!cfg.mode; // Attention, enum.

                this.updownBrightness.trackBar.value = cfg.brightness - 50;
                this.updownBrightness.status.message = cfg.brightness > 100 ? '+' + (cfg.brightness - 100) : cfg.brightness < 100 ? '-' + (100 - cfg.brightness) : 'off';

                this.updownContrast.trackBar.value = cfg.contrast - 50;
                this.updownContrast.status.message = cfg.contrast > 100 ? '+' + (cfg.contrast - 100) : cfg.contrast < 100 ? '-' + (100 - cfg.contrast) : 'off';

                this.updownGrayscale.trackBar.value = cfg.grayscale;
                this.updownGrayscale.status.message = cfg.grayscale > 0 ? '+' + cfg.grayscale : 'off';

                this.updownSepia.trackBar.value = cfg.sepia;
                this.updownSepia.status.message = cfg.sepia > 0 ? '+' + cfg.sepia : 'off';

                this.fontSet.isFontUsed = cfg.usefont;
                this.fontSet.fontFamily = cfg.fontfamily;

                this.updownTextStroke.trackBar.value = cfg.textstroke * 100;
                this.updownTextStroke.status.message = cfg.textstroke > 0 ? '+' + cfg.textstroke : 'off';

                this.ignoreList.values = cfg.ignorelist;
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

            // Ignore list
            this.ignoreList.onValuesChanged.addHandler((values) => {
                this.currentConfig.ignorelist = values;
                this.app.config = this.currentConfig;
            }, this);


            // Set focus when ignorelist tab is opened
            this.tabPanel.onTabSwitch.addHandler(index=> {
                if (index === 2) {
                    this.ignoreList.setFocus();
                }
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
        tabPanel: TabPanel;
        ignoreList: IgnoreList;

        private initControls() {
            this.toggleApp = new ToggleWithStatus('toggle-app');
            this.toggleMode = new ToggleWithButtons('toggle-mode');
            this.updownBrightness = new UpDown('updown-brightness');
            this.updownContrast = new UpDown('updown-contrast');
            this.updownGrayscale = new UpDown('updown-grayscale');
            this.updownSepia = new UpDown('updown-sepia');
            this.fontSet = new FontSet('control-usefont');
            this.updownTextStroke = new UpDown('updown-textstroke');
            this.tabPanel = new TabPanel('tab-panel');
            this.ignoreList = new IgnoreList('ignore-list');
        }
    }
} 