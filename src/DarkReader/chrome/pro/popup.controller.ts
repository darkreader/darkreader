module DarkReader.Chrome.Pro.Popup {
    /**
     * Pop-up page controller.
     */
    export class PopupController {

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
            this.subscriptions.push(this.app.onConfigSetup.addHandler((args) => {

            }, this));


            //------------------------
            // From view to background  --->
            //------------------------

            this.toggleApp.toggle.onUserToggle.addHandler((isOn) => {
                if (isOn) {
                    this.app.enable();
                }
                else {
                    this.app.disable();
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

        private initControls() {
            this.toggleApp = new ToggleWithStatus('toggle-app');
            this.toggleMode = new ToggleWithButtons('toggle-mode');
            this.updownBrightness = new UpDown('updown-brightness');
            this.updownContrast = new UpDown('updown-contrast');
            this.updownGrayscale = new UpDown('updown-grayscale');
            this.updownSepia = new UpDown('updown-sepia');
            this.fontSet = new FontSet('control-usefont');
            this.updownTextStroke = new UpDown('updown-textstroke');
        }
    }
} 