module DarkReader.Popup {

    /**
     * Control for adjusting value using up/down buttons.
     */
    export class UpDown extends xp.VBox {
        value: number;
        getterConvertor: (v: number) => number;
        setterConvertor: (v: number) => number;
        statusCreator: (v: number) => string;
        step: number;
        label: string;
        protected buttonUp: xp.Button;
        protected buttonDown: xp.Button;
        protected trackBar: TrackBar;
        protected status: xp.Label;

        constructor(markup: UpDownMarkup) {
            super(markup, [
                new xp.HBox({ style: 'line' }, [
                    new xp.Button({
                        style: 'iconButton',
                        icon: '.buttonDown',
                        init: (el) => this.buttonDown = el
                    }),
                    new TrackBar({
                        init: (el) => this.trackBar = el
                    }),
                    new xp.Button({
                        style: 'iconButton',
                        icon: '.buttonUp',
                        init: (el) => this.buttonUp = el
                    })
                ]),
                new xp.Label({
                    style: 'status',
                    init: (el) => this.status = el
                })
            ]);

            // Increment
            this.buttonUp.onClick.addHandler(() => {
                if (this.trackBar.value < 1) {
                    var value = this.trackBar.value + this.step;
                    if (value > 1) { value = 1; }
                    if (this.getterConvertor) {
                        value = this.getterConvertor(value);
                    }
                    this.onInput('value', value);
                }
            }, this);
            // Decrement
            this.buttonDown.onClick.addHandler(() => {
                if (this.trackBar.value > 0) {
                    var value = this.trackBar.value - this.step;
                    if (value < 0) { value = 0; }
                    if (this.getterConvertor) {
                        value = this.getterConvertor(value);
                    }
                    this.onInput('value', value);
                }
            }, this);

            // Disable buttons on boundary values
            this.buttonDown.useParentScope = false;
            this.buttonDown.express('enabled', '{value} > 0', this.trackBar);
            this.buttonUp.useParentScope = false;
            this.buttonUp.express('enabled', '{value} < 1', this.trackBar);
        }

        protected getTemplate() {
            var t = super.getTemplate();
            t.classList.add('UpDown');
            return t;
        }

        protected setDefaults() {
            super.setDefaults();
            this.step = 0.1;
        }

        protected defineProperties() {
            super.defineProperties();
            this.defineProperty('value', {
                getter: () => {
                    if (this.getterConvertor) {
                        return this.getterConvertor(this.trackBar.value);
                    } else {
                        return this.trackBar.value;
                    }
                },
                setter: (v: number) => {
                    if (this.setterConvertor) {
                        this.trackBar.value = this.setterConvertor(v);
                    } else {
                        this.trackBar.value = v;
                    }
                    if (this.statusCreator) {
                        this.status.text = this.statusCreator(v);
                    }
                }
            });
            this.defineProperty('label', {
                getter: () => this.trackBar.label,
                setter: (v: string) => this.trackBar.label = v
            });
        }
    }

    export interface UpDownMarkup extends xp.VBoxMarkup<UpDown> {
        value?: number|string;
        getterConvertor?: (v: number) => number;
        setterConvertor?: (v: number) => number;
        statusCreator?: (v: number) => string;
        step?: number;
        label?: string;
    }

    /**
     * Track bar.
     */
    class TrackBar extends xp.Element {
        value: number;
        label: string;

        constructor(markup: TrackBarMarkup) {
            super(markup);
        }

        // TODO: Trackbar click...

        protected getTemplate() {
            return xp.Dom.create({
                tag: 'span',
                attrs: { class: 'TrackBar' },
                children: [
                    { tag: 'span', attrs: { class: 'value' }, children: ['\u00A0'] },
                    { tag: 'label' }
                ]
            }, {
                    '.value': (el) => this.elementValue = el,
                    'label': (el) => this.elementLabel = el
                });
        }
        protected elementValue: HTMLElement;
        protected elementLabel: HTMLLabelElement;

        protected defineProperties() {
            super.defineProperties();
            this.defineProperty('value', {
                setter: (value: number) => {
                    if (value < 0 || value > 1) {
                        throw new Error('Track bar value must be between 0 and 1');
                    }
                    this.elementValue.style.width = Math.round(value * 100) + '%';
                },
                observable: true
            });
            this.defineProperty('label', {
                setter: (value: string) => {
                    this.elementLabel.textContent = value;
                }
            });
        }
    }

    interface TrackBarMarkup extends xp.ElementMarkup<TrackBar> {
        value?: number|string;
        label?: string;
    }
} 