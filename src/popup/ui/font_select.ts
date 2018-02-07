module DarkReader.Popup {
    /**
     * Control for selecting a font.
     */
    export class FontSelect extends xp.VBox {
        selectedFont: string;
        fonts: string[];
        private textBox: xp.TextBox;
        private tick: xp.Button;
        private fontList: xp.VBox;

        constructor(markup: FontSelectMarkup) {
            super(markup, [
                new xp.HBox({ style: 'fontSelectLine' }, [
                    new xp.TextBox({
                        style: 'fontSelectTextBox',
                        flex: 'stretch',
                        init: (tb) => this.textBox = tb,
                        notifyOnKeyDown: true,
                        onTextChange: (e) => this.scrollToItemByText(e.newText)
                    }),
                    new xp.Button({
                        style: 'fontSelectTick iconButton',
                        flex: 'none',
                        icon: '.down',
                        init: (b) => this.tick = b,
                        onClick: (e) => {
                            if (this.isListExpanded) {
                                this.collapseList();
                            } else {
                                this.scrollToItemByText(this.textBox.text);
                            }
                        }
                    })
                ]),
                new xp.VBox({
                    style: 'fontList collapsed',
                    flex: 'stretch',
                    init: (v) => this.fontList = v
                })
            ]);
            this.onClick.addHandler((e) => e.domEvent.stopPropagation());
            this.outerClickHandler = () => this.collapseList();
        }

        protected getTemplate() {
            const t = super.getTemplate();
            t.classList.add('FontSelect');
            return t;
        }

        protected setDefaults() {
            super.setDefaults();
            this.fonts = [];
        }

        protected defineProperties() {
            super.defineProperties();
            this.defineProperty('fonts', {
                setter: (fonts: string[]) => {
                    this.areFontsRendered = false;
                }
            });
            this.defineProperty('selectedFont', {
                setter: (font: string) => {
                    this.textBox.text = font;
                }
            });
        }

        // Expand/collapse font list
        private get isListExpanded() {
            return !this.fontList.domElement.classList.contains('collapsed');
        }
        private expandList(done?: () => void) {
            const expand = () => {
                this.fontList.domElement.classList.remove('collapsed');
                window.addEventListener('click', this.outerClickHandler);
                done && done();
            };
            if (!this.areFontsRendered) {
                this.renderFonts(this.fonts, expand);
            } else {
                expand();
            }
        }
        private collapseList() {
            this.fontList.domElement.classList.add('collapsed');
            window.removeEventListener('click', this.outerClickHandler);
        }
        private outerClickHandler: () => void;

        //
        // --- Event handlers ---

        private onPickFont(f: string) {
            this.collapseList();
            this.onInput('selectedFont', f);
        }

        private scrollToItemByText(text: string) {
            const onListExpanded = () => {
                text = text.toLowerCase().trim();
                let i;
                for (i = 0; i < this.fonts.length; i++) {
                    if (this.fonts[i].toLowerCase().indexOf(text) === 0) {
                        // Scroll to item
                        const item = this.fontList.children.filter((c: xp.Label) => c.text === this.fonts[i])[0];
                        if (item) {
                            item.domElement.scrollIntoView(true);
                        }
                        break;
                    }
                    // TODO: Search by font name words.
                }
            };
            if (!this.isListExpanded) {
                this.expandList(onListExpanded);
            } else {
                onListExpanded();
            }
        }

        private areFontsRendered: boolean;
        private renderFonts(fonts: string[], done?: () => void) {
            // Add new font items
            this.domElement.classList.add('renderingFonts');
            this.fontList.removeChildren();
            if (fonts) {
                // WARNING: Slow fonts rendering (100 fonts >1000ms).
                setTimeout(() => {
                    fonts = fonts.slice(0);
                    console.time('Rendering fonts');
                    for (let i = 0; i < fonts.length; i++) {
                        ((font) => {
                            this.fontList.append(new xp.Label({
                                style: 'fontItem',
                                text: font,
                                onClick: () => this.onPickFont(font),
                                init: (el) => el.domElement.style.fontFamily = font
                            }));
                        })(fonts[i]);
                    }
                    setTimeout(() => {
                        console.timeEnd('Rendering fonts');
                        this.domElement.classList.remove('renderingFonts');
                        this.areFontsRendered = true;
                        done && done();
                    }, 0);
                }, 100); // Timeout needed as far as "Loading" message is not shown.
            }
        }
    }

    export interface FontSelectMarkup extends xp.VBoxMarkup<FontSelect> {
        selectedFont?: string;
        fonts?: string[] | string;
    }
}
