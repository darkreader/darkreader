module DarkReader.Popup {

    /**
     * Developer tools panel.
     */
    export class DevTools extends xp.VBox {

        isOpen: boolean;
        inversionFixText: string;
        inversionFixErrorText: string;

        private inversionTextArea: xp.TextArea;
        private inversionErrorLabel: xp.Label;

        constructor(markup: DevToolsMarkup) {
            super(markup, [

                new xp.Label({
                    flex: 'none',
                    style: 'devToolsTitle',
                    text: 'Developer Tools'
                }),

                new xp.Button({
                    style: 'devToolsCloseButton',
                    text: '✕',
                    onClick: () => this.isOpen = false
                }),

                new xp.VBox({ style: 'inversionFixEditor', flex: 'stretch' }, [

                    new xp.Label({
                        style: 'description',
                        text: 'Inversion fix editor'
                    }),

                    new xp.TextArea({
                        flex: 'stretch',
                        init: (ta: xp.TextArea) => this.inversionTextArea = ta
                    }),

                    new xp.Label({
                        style: 'inversionFixErrorText',
                        init: (el) => this.inversionErrorLabel = el
                    }),

                    new xp.HBox({ flex: 'none', style: 'inversionFixEditorButtons' }, [
                        new xp.Button({
                            flex: 'stretch',
                            text: 'Reset',
                            onClick: () => markup.onReset()
                        }),
                        new xp.Button({
                            flex: 'stretch',
                            text: 'Apply',
                            onClick: () => markup.onApply(this.inversionFixText)
                        })
                    ]),

                    new xp.Html({
                        html: `
                            <div class="description selectable">
                                Read about this tool <strong><a href="https://github.com/alexanderby/darkreader#how-to-contribute" target="_blank">here</a></strong>. If a <strong>popular</strong>
                                website looks incorrect e-mail to
                                <strong>DarkReaderApp@gmail.com</strong>
                            </div>
                        `
                    })
                ])

            ]);

            this.isOpen = markup.isOpen;
            this.inversionFixText = markup.inversionFixText;
        }

        protected getTemplate() {
            var t = super.getTemplate();
            t.classList.add('DevTools');
            return t;
        }

        protected defineProperties() {
            super.defineProperties();

            this.defineProperty('isOpen', {
                getter: () => {
                    return this.domElement.classList.contains('open');
                },
                setter: (v: boolean) => {
                    if (v) {
                        this.domElement.classList.add('open');
                    } else {
                        this.domElement.classList.remove('open');
                    }
                }
            });

            this.defineProperty('inversionFixText', {
                getter: () => {
                    return this.inversionTextArea.text;
                },
                setter: (text: string) => {
                    this.inversionTextArea.text = text;
                }
            });

            this.defineProperty('inversionFixErrorText', {
                getter: () => {
                    return this.inversionErrorLabel.text;
                },
                setter: (text: string) => {
                    this.inversionErrorLabel.text = text;
                }
            });
        }

    }

    export interface DevToolsMarkup extends xp.VBoxMarkup<DevTools> {
        isOpen: boolean;
        inversionFixText: string;
        onReset: () => void;
        onApply: (text: string) => void;
    }
}