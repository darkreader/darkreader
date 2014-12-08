module DarkReader.Chrome.Pro.Popup {

    // Access extension from background
    var app = <Application<Generation.FilterConfig>>(<any>chrome.extension.getBackgroundPage()).DarkReader.Chrome.Pro.Background.app;

    // Controls
    var toggle_app = document.getElementById('toggle-app');

    //document.addEventListener('DOMContentLoaded', onPageLoaded);
    toggle_app.addEventListener('click', () => {
        app.toggle();
    });

    var controller = new PopupController();


    /**
     * Pop-up page controller.
     */
    class PopupController {
        constructor() {
            this.initControls();

            this.subscriptions = [];
            this.registerEventsHandlers();

            // Subscribe for window closing
            window.onbeforeunload = (e) => {
                this.unregisterEventsHandlers();
            };
        }


        //-------------------
        // EVENT REGISTRATION
        //-------------------

        private subscriptions: Subscription<any>[];

        /**
         * Registers events handlers.
         */
        private registerEventsHandlers() {
            // On config setup
            this.subscriptions.push(app.onConfigSetup.addHandler((args) => {

            }, this));
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

        private initControls() { }
    }


    //------------
    // UI CONTROLS
    //------------

    /**
     * Base control.
     */
    class Control {
        protected element: HTMLElement;

        constructor(elementId: string);
        constructor(element: HTMLElement);
        constructor(elementOrId) {
            var element = typeof elementOrId === 'string' ?
                document.getElementById(elementOrId)
                : <HTMLElement>elementOrId;

            if (!element)
                throw new Error('Unable to create control. Parameter: "' + elementOrId + '".');

            this.element = element;
            this.initContent();
            this.initEvents();
        }

        protected initContent() { }
        protected initEvents() { } ok
    }


    /**
     * Toggle control.
     */
    class Toggle extends Control {
        /*
            <div class="toggle">
                <span class="on active">On</span><span class="off">Off</span>
            </div>
         */
        private elementOn: HTMLElement;
        private elementOff: HTMLElement;
        private _isOn: boolean;

        protected initContent() {
            this.elementOn = getChildByClassName(this.element, 'on');
            this.elementOff = getChildByClassName(this.element, 'off');

            if (!this.elementOn || !this.elementOff)
                throw new Error('Unable to create toggle. Wrong DOM.');
        }

        /**
         * Gets or sets toggle value.
         */
        get isOn() {
            return this._isOn;
        }
        set isOn(on) {
            this._isOn = on;

            // DOM
            if (on) {
                this.elementOn.classList.add('active');
                this.elementOff.classList.remove('active');
            }
            else {
                this.elementOff.classList.add('active');
                this.elementOn.classList.remove('active');
            }
        }

        protected initEvents() {
            this.onUserToggle = new Event<boolean>();

            this.elementOn.onclick = () => {
                if (this.isOn === false) {
                    this.onUserToggle.invoke(true);
                }
            };
            this.elementOff.onclick = () => {
                if (this.isOn === true) {
                    this.onUserToggle.invoke(false);
                }
            };
        }

        /**
         * Fires when user toggles the control.
         */
        onUserToggle: Event<boolean>;
    }


    /**
     * Simple button control.
     */
    class Button extends Control {
        /*
            <span class="icon-button"></span>
        */

        protected initEvents() {
            this.element.onclick = (e) => {
                this.onClick.invoke({});
            };
        }

        /**
         * Fires when button is clicked.
         */
        onClick: Event<{}>;
    }


    /**
     * Status control.
     */
    class Status extends Control {
        /*
            <p class="status">Status</p>
         */

        private _message: string;

        /**
        * Gets or sets status message.
        */
        get message() {
            return this._message;
        }
        set message(status) {
            this._message = status;

            // DOM
            this.element.textContent = status;
        }
    }


    /**
     * Control containing toggle and status controls.
     */
    class ToggleWithStatus extends Control {
        toggle: Toggle;
        status: Status;

        protected initElements() {
            this.toggle = new Toggle(getChildByClassName(this.element, 'toggle'));
            this.status = new Status(getChildByClassName(this.element, 'status'));
        }
    }


    /**
     * Specific control with toggle, status and buttons (just to fit design).
     */
    class ToggleWithButtons extends ToggleWithStatus {
        buttonUp: Button;
        buttonDown: Button;

        protected initElements() {
            super.initElements();
            this.buttonUp = new Button(getChildByClassName(this.element, 'button-down'));
            this.buttonDown = new Button(getChildByClassName(this.element, 'button-up'));
        }
    }


    //--------
    // HELPERS
    //--------

    /**
     * Returns first element's child with given class name.
     * @param element Container element.
     * @param className Class name.
     */
    function getChildByClassName(element: HTMLElement, className: string): HTMLElement {
        return <HTMLElement>element.getElementsByClassName(className).item(0);
    }
}