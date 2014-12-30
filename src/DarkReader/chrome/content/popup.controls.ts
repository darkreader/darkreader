module DarkReader.Chrome.Pro.Popup {
    //------------
    // UI CONTROLS
    //------------

    /**
     * Base control.
     */
    export class Control {
        protected element: HTMLElement;

        /**
         * Creates the control in element with given ID.
         */
        constructor(elementId: string);

        /**
         * Creates the control in the given element.
         */
        constructor(element: HTMLElement);

        /**
         * Creates the control.
         */
        constructor(elementOrId) {
            var element = typeof elementOrId === 'string' ?
                document.getElementById(elementOrId)
                : <HTMLElement>elementOrId;

            if (!element)
                throw new Error('Unable to create control. Parameter: "' + elementOrId + '".');

            this.element = element;
            this.initContent();
            this.initEvents();
            this.onInitComplete();
        }

        /**
         * Performs control's content initialization.
         */
        protected initContent() { }

        /**
         * Performs control's events initialization.
         */
        protected initEvents() { }

        /**
         * Is invoked after control's initialization is complete.
         */
        protected onInitComplete() { }
    }


    /**
     * Toggle control.
     */
    export class Toggle extends Control {
        /*
            <div class="toggle">
                <span class="on active">On</span><span class="off">Off</span>
            </div>
         */
        private elementOn: HTMLElement;
        private elementOff: HTMLElement;
        private _isOn: boolean = false;

        protected initContent() {
            this.elementOn = <HTMLElement>this.element.querySelector('.on');
            this.elementOff = <HTMLElement>this.element.querySelector('.off');

            if (!this.elementOn || !this.elementOff)
                throw new Error('Unable to create toggle. Wrong DOM.');

            // Set default value
            this.isOn = false;
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

            // Switch on
            this.elementOn.onclick = () => {
                if (this.isOn === false) {
                    this.onUserToggle.invoke(true);
                }
            };
            // Switch off
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
    export class Button extends Control {
        /*
            <span class="icon-button"></span>
        */

        protected initEvents() {
            this.onClick = new Event<{}>();
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
    export class Status extends Control {
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
    export class ToggleWithStatus extends Control {
        toggle: Toggle;
        status: Status;

        protected initContent() {
            this.toggle = new Toggle(<HTMLElement>this.element.querySelector('.toggle'));
            this.status = new Status(<HTMLElement>this.element.querySelector('.status'));
        }
    }


    /**
     * Specific control with toggle, status and buttons (just to fit design).
     */
    export class ToggleWithButtons extends ToggleWithStatus {
        buttonOn: Button;
        buttonOff: Button;

        protected initContent() {
            super.initContent();
            this.buttonOn = new Button(<HTMLElement>this.element.querySelector('.button-down'));
            this.buttonOff = new Button(<HTMLElement>this.element.querySelector('.button-up'));
        }

        protected initEvents() {
            // Switch on
            this.buttonOn.onClick.addHandler(() => {
                if (!this.toggle.isOn) {
                    this.toggle.onUserToggle.invoke(true);
                }
            }, this);
            // Switch off
            this.buttonOff.onClick.addHandler(() => {
                if (this.toggle.isOn) {
                    this.toggle.onUserToggle.invoke(false);
                }
            }, this);
        }
    }

    /**
     * Track bar.
     */
    export class TrackBar extends Control {
        /*
            <span class="trackbar">
                <span class="value">&nbsp;</span>
                <label>Label</label>
            </span>
         */

        private elementValue: HTMLElement;
        private elementLabel: HTMLElement;
        private _value: number;

        protected initContent() {
            this.elementValue = <HTMLElement>this.element.querySelector('.value');
            this.elementLabel = this.element.getElementsByTagName('label').item(0);

            if (!this.elementValue || !this.elementLabel)
                throw new Error('Unable to create track bar. Wrong DOM.');
        }

        // TODO: Trackbar click...

        /**
         * Gets or sets track bar value.
         * Value must be between 0 and 100.
         */
        get value() {
            return this._value;
        }
        set value(value) {
            if (value < 0 || value > 100)
                throw new Error('Track bar value must be between 0 and 100');

            this._value = value;

            // DOM
            this.elementValue.style.width = value + '%';
        }

        protected initEvents() {
            this.onUserSetValue = new Event<number>();
        }

        /**
         * Fires when user sets value.
         */
        onUserSetValue: Event<number>;
    }


    /**
     * Control for adjusting value using up/down buttons.
     */
    export class UpDown extends Control {
        buttonUp: Button;
        buttonDown: Button;
        trackBar: TrackBar;
        status: Status;
        protected step = 10;

        protected initContent() {
            this.buttonUp = new Button(<HTMLElement>this.element.querySelector('.button-up'));
            this.buttonDown = new Button(<HTMLElement>this.element.querySelector('.button-down'));
            this.trackBar = new TrackBar(<HTMLElement>this.element.querySelector('.trackbar'));
            this.status = new Status(<HTMLElement>this.element.querySelector('.status'));
        }

        protected initEvents() {
            // Increment
            this.buttonUp.onClick.addHandler(() => {
                if (this.trackBar.value < 100) {
                    var value = this.trackBar.value + this.step;
                    if (value > 100)
                        value = 100;
                    this.trackBar.onUserSetValue.invoke(value);
                }
            }, this);
            // Decrement
            this.buttonDown.onClick.addHandler(() => {
                if (this.trackBar.value > 0) {
                    var value = this.trackBar.value - this.step;
                    if (value < 0)
                        value = 0;
                    this.trackBar.onUserSetValue.invoke(value);
                }
            }, this);
        }
    }


    /**
     * Control for setting font.
     */
    export class FontSet extends Control {
        status: Status;
        private checkbox: HTMLInputElement;
        private textbox: HTMLInputElement;
        private _isFontUsed: boolean;
        private _fontFamily: string;

        protected initContent() {
            this.status = new Status(<HTMLElement>this.element.querySelector('.status'));
            this.checkbox = <HTMLInputElement>this.element.querySelector('input[type=checkbox]');
            this.textbox = <HTMLInputElement>this.element.querySelector('input[type=text]');

            if (!this.checkbox || !this.textbox)
                throw new Error('Unable to create font set. Wrong DOM.');
        }


        /**
         * Gets or sets whether custom font is used.
         */
        get isFontUsed() {
            return this._isFontUsed;
        }
        set isFontUsed(use) {
            this._isFontUsed = use;

            // DOM
            this.checkbox.checked = use;
        }

        /**
         * Gets or sets font family.
         */
        get fontFamily() {
            return this._fontFamily;
        }
        set fontFamily(font) {
            this._fontFamily = font;

            // DOM
            this.textbox.value = font;
        }


        protected initEvents() {
            this.onUserCheckChange = new Event<boolean>();
            this.onUserTextChange = new Event<string>();

            // On check change
            this.checkbox.onchange = (e) => {
                this.onUserCheckChange.invoke(this.checkbox.checked);
            };
            // On text change
            this.textbox.onchange = (e) => {
                this.onUserTextChange.invoke(this.textbox.value);
            };
            // No focus on 'Enter' key
            this.textbox.onkeypress = (e) => {
                if (e.keyCode === 13) {
                    (<any>document.activeElement).blur();
                }
            };
        }

        /**
         * Fires when user changes the checkbox value.
         */
        onUserCheckChange: Event<boolean>;
        /**
         * Fires when user has edited the text.
         */
        onUserTextChange: Event<string>;
    }


    /**
     * Tab panel.
     */
    export class TabPanel extends Control {
        private tabs: HTMLElement[];
        private buttons: HTMLElement[];

        protected initContent() {
            this.tabs = Array.prototype.slice.call(this.element.querySelectorAll('.tab'));
            this.buttons = Array.prototype.slice.call(this.element.querySelectorAll('.tab-panel-button'));
        }

        protected initEvents() {
            this.buttons.forEach((b, i) => {
                b.onclick = () => this.switchTab(i);
            });
            this.onTabSwitch = new Event<number>();
        }

        private switchTab(index: number) {
            this.buttons.forEach((b) => b.classList.remove('active'));
            this.buttons[index].classList.add('active');

            this.tabs.forEach((t) => t.classList.remove('active'));
            this.tabs[index].classList.add('active');

            this.onTabSwitch.invoke(index);
        }

        /**
         * Fires when user has switched a tab.
         */
        onTabSwitch: Event<number>;
    }


    /**
     * Ignore list.
     */
    export class IgnoreList extends Control {
        private _values: string[];

        /**
         * Gets or sets ignore list.
         */
        get values() {
            return this._values;
        }
        set values(list) {
            this._values = list;

            //
            // DOM

            // Remove children
            while (this.element.firstChild) {
                this.element.removeChild(this.element.firstChild);
            }

            // Add textboxes
            list.forEach((value) => this.addTextBox(value));

            // Add final empty textbox
            this.addTextBox('');
            this.setFocus();
        }

        private addTextBox(value: string): HTMLInputElement {
            var textBox = document.createElement('input');
            textBox.type = 'text';
            textBox.placeholder = 'mail.google.com';
            textBox.value = value;
            textBox.onchange = (e) => {
                var values = this.getInputValues();
                this.onValuesChanged.invoke(values);
            };
            this.element.appendChild(textBox);
            return textBox;
        }

        private getInputValues(): string[] {
            var values = [];
            var children = <HTMLInputElement[]>Array.prototype.slice.call(this.element.children);
            children.forEach((c) => {
                var v = c.value.trim();

                // Validate
                if (!!v.match(this.regex)) {
                    values.push(v);
                }
            });

            return values;
        }

        private regex = /^([^\.\s]+?\.?)+$/;

        /**
         * Sets the focus to the last textbox.
         */
        setFocus() {
            (<HTMLInputElement>this.element.lastChild).focus();
        }

        protected initEvents() {
            this.onValuesChanged = new Event<string[]>();
        }

        /**
         * Fires when user changes any value.
         */
        onValuesChanged: Event<string[]>;
    }


    //--------
    // HELPERS
    //--------

    ///**
    // * Returns the first element's child with the given class name.
    // * @param element Container element.
    // * @param className Class name.
    // */
    //function getChildByClassName(element: HTMLElement, className: string): HTMLElement {
    //    return <HTMLElement>element.getElementsByClassName(className).item(0);
    //}
} 