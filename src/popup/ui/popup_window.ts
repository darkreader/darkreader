/// <reference path="../../typings/refs.d.ts"/>

module DarkReader.Popup {

    export class PopupWindow extends xp.Window {
        constructor(ext: Extension) {
            super({ title: 'Dark Reader settings', scope: ext }, [

                //
                // ---- Logo ----

                new xp.Html({ html: '<img id="logo" src="img/dark-reader-type.svg" alt="Dark Reader" />' }),

                //
                // ---- Top section ----

                new xp.HBox({ name: 'topSection', itemsAlign: 'top' }, [
                    new xp.Label({
                        name: 'appDescription',
                        style: 'description',
                        text: 'Adjust settings that\nbetter fit your screen'
                    }),
                    new xp.VBox({ flex: 'stretch', name: 'appToggle' }, [
                        new Toggle({
                            value: '{enabled}'
                        }),
                        new xp.Label({
                            style: 'status',
                            text: 'hotkey: Alt+Shift+D'
                        })
                    ])
                ]),

                //
                // ---- Tab panel ----

                new TabPanel({ onTabSwitched: (t) => t.tabName === 'Site list' && this.siteList.focus() }, [

                    //
                    // ---- Filter ----

                    new Tab({ tabName: 'Filter', itemsAlign: 'stretch' }, [
                        // Mode
                        new xp.VBox({ name: 'modeToggle', style: 'controlContainer' }, [
                            new xp.HBox({ style: 'line' }, [
                                new xp.ToggleButton({
                                    style: 'iconButton',
                                    icon: '.darkMode',
                                    item: 1/*FilterMode.dark*/,
                                    selectedItem: '{config.mode}'
                                }),
                                new Toggle({
                                    value: '{config.mode}',
                                    valueOn: 1,
                                    valueOff: 0,
                                    labelOn: 'Dark',
                                    labelOff: 'Light',
                                    flex: 'stretch'
                                }),
                                new xp.ToggleButton({
                                    style: 'iconButton',
                                    icon: '.lightMode',
                                    item: 0/*FilterMode.light*/,
                                    selectedItem: '{config.mode}'
                                })
                            ]),
                            new xp.Label({ style: 'status', text: 'Mode' })
                        ]),

                        // Brightness
                        new UpDown({
                            label: 'Brightness',
                            step: 0.1,
                            value: '{config.brightness}',
                            setterConvertor: (v: number) => (v - 50) / 100,
                            getterConvertor: (v: number) => Math.round(v * 100) + 50,
                            statusCreator: (v: number) => v > 100 ?
                                '+' + (v - 100)
                                : v < 100 ?
                                    '-' + (100 - v)
                                    : 'off'
                        }),

                        // Contrast
                        new UpDown({
                            label: 'Contrast',
                            step: 0.1,
                            value: '{config.contrast}',
                            setterConvertor: (v: number) => (v - 50) / 100,
                            getterConvertor: (v: number) => Math.round(v * 100) + 50,
                            statusCreator: (v: number) => v > 100 ?
                                '+' + (v - 100)
                                : v < 100 ?
                                    '-' + (100 - v)
                                    : 'off'
                        }),

                        // Grayscale
                        new UpDown({
                            label: 'Grayscale',
                            step: 0.1,
                            value: '{config.grayscale}',
                            setterConvertor: (v: number) => v / 100,
                            getterConvertor: (v: number) => Math.round(v * 100),
                            statusCreator: (v: number) => v > 0 ?
                                '+' + v
                                : 'off'
                        }),

                        // Sepia
                        new UpDown({
                            label: 'Sepia',
                            step: 0.1,
                            value: '{config.sepia}',
                            setterConvertor: (v: number) => v / 100,
                            getterConvertor: (v: number) => Math.round(v * 100),
                            statusCreator: (v: number) => v > 0 ?
                                '+' + v
                                : 'off'
                        }),
                    ]),
                    
                    //
                    // ---- Font ----

                    new Tab({ tabName: 'Font' }, [
                        //// Select font
                        //new xp.VBox({ style: 'controlContainer' }, [
                        //    new xp.HBox({ style: 'line' }, [
                        //        new xp.CheckBox({
                        //            checked: '{config.useFont}'
                        //        }),
                        //        new xp.TextBox({
                        //            text: '{config.fontFamily}'
                        //        })
                        //    ]),
                        //    new xp.Label({ style: 'status', text: 'Select a font' })
                        //]),
                        // Select font
                        new xp.VBox({ style: 'controlContainer' }, [
                            new xp.HBox({ style: 'line' }, [
                                new xp.CheckBox({
                                    checked: '{config.useFont}'
                                }),
                                new FontSelect({
                                    fonts: '{fonts}',
                                    selectedFont: '{config.fontFamily}',
                                    flex: 'stretch',
                                }),
                            ]),
                            new xp.Label({ style: 'status', text: 'Select a font' })
                        ]),

                        // Text stroke
                        new UpDown({
                            label: 'Text stroke',
                            step: 0.1,
                            value: '{config.textStroke}',
                            //setterConvertor: (v: number) => (v - 50) / 100,
                            getterConvertor: (v: number) => Math.round(v * 10) / 10,
                            statusCreator: (v: number) => v > 0 ?
                                '+' + v
                                : v === 0 ?
                                    'off'
                                    : 'Wrong value'
                        })
                    ]),

                    //
                    // ---- Site list ----

                    new Tab({ tabName: 'Site list' }, [
                        //new xp.VBox({ style: 'controlContainer' }, [
                        //    new Toggle({
                        //        switchedOn: '{config.invertListed}',
                        //        labelOn: 'Invert listed only',
                        //        labelOff: 'Not invert listed'
                        //    }),
                        //    new xp.Label({ style: 'status', text: 'Choose if listed sites are inverted' })
                        //]),
                        new Toggle({
                            value: '{config.invertListed}',
                            labelOn: 'Invert listed only',
                            labelOff: 'Not invert listed',
                            flex: 'none'
                        }),
                        new xp.VBox({ flex: 'stretch', scrollBar: 'vertical', style: 'siteListParent' }, [
                            new SiteList({
                                sites: '{config.siteList}',
                                init: (sl) => this.siteList = sl
                            }),
                            new xp.Label({
                                style: 'description',
                                text: 'hotkey for adding site: Alt+Shift+S'
                            })
                        ]),
                    ])

                ]),
                
                //
                // ---- Title ----

                new xp.Html({
                    html: `
                    <p class="description">Some things should not be inverted?
                        Please, send a website address at
                        <strong>darkReaderApp@gmail.com</strong></p>
                    `
                }),
            ]);
        }

        private siteList: SiteList;

        protected getTemplate() {
            // Clear body
            while (document.body.lastElementChild) {
                document.body.removeChild(
                    document.body.lastElementChild);
            }
            return super.getTemplate();
        }
    }
} 