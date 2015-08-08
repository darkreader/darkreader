/// <reference path="../../typings/refs.d.ts"/>

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
                                this.expandList();
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
            //this.bind('fonts', 'fonts');
        }

        protected getTemplate() {
            var t = super.getTemplate();
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
                    // Add new font items
                    this.fontList.removeChildren();
                    if (fonts) {
                        fonts = fonts.slice(0);
                        for (var i = 0; i < fonts.length; i++) {
                            var l = new xp.Label({
                                style: 'fontItem',
                                text: fonts[i],
                                init: (l) => l.domElement.style.fontFamily = fonts[i],
                                onClick: () => this.onPickFont(fonts[i])
                            });
                            this.fontList.append(l);
                        }
                    }
                }
            });
            this.defineProperty('selectedFont', {
                setter: (font: string) => {
                    this.textBox.text = font;
                }
                //observable: true
            });
        }

        // Expand/collapse font list
        private get isListExpanded() {
            return !this.fontList.domElement.classList.contains('collapsed');
        }
        private expandList() {
            this.fontList.domElement.classList.remove('collapsed');
            window.addEventListener('click', this.outerClickHandler);
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
            if (!this.isListExpanded) {
                this.expandList();
            }
            text = text.toLowerCase().trim();
            for (var i = 0; i < this.fonts.length; i++) {
                if (this.fonts[i].toLowerCase().indexOf(text) === 0) {
                    // Scroll to item
                    var item = this.fontList.children.filter((c: xp.Label) => c.text === this.fonts[i])[0];
                    if (item) {
                        item.domElement.scrollIntoView(true);
                    }
                    break;
                }
                //var parts = this.fonts[i].toLowerCase().split(' ');
                //for (var j = 0; j < parts.length; j++) {
                //    if (parts[j].indexOf(text) === 0) {
                //        // Scroll to item
                //        var item = this.fontList.children.filter((c: xp.Label) => c.text === this.fonts[i])[0];
                //        if (item) {
                //            item.domElement.scrollIntoView(true);
                //        }
                //        break;
                //    }
                //}
            }
        }
    }

    export interface FontSelectMarkup extends xp.VBoxMarkup<FontSelect> {
        selectedFont?: string;
        fonts?: string[]|string;
    }
}