module DarkReader.Popup {

    export class PopupWindow extends xp.Window {
        constructor(ext: Extension) {
            super({ title: 'Dark Reader settings', scope: ext, scrollBar: 'none' }, [

                //
                // ---- Logo ----

                new xp.Html({
                    html: {
                        tag: 'img',
                        attrs: { id: 'logo', src: 'img/dark-reader-type.svg', alt: 'Dark Reader' }
                    },
                    flex: 'none'
                }),

                //
                // ---- Top section ----

                new xp.HBox({ name: 'topSection', itemsAlign: 'top', flex: 'none' }, [
                    // new xp.Label({
                    //     name: 'appDescription',
                    //     style: 'description',
                    //     text: 'Adjust settings that\nbetter fit your screen'
                    // }),
                    new xp.VBox({ flex: 'stretch', style: 'controlContainer siteToggleContainer' }, [
                        new xp.Button({
                            name: 'siteToggle',
                            onClick: () => {
                                ext.toggleCurrentSite();
                            }
                        }),
                        new HotkeyLink({
                            commandName: 'addSite',
                            noHotkeyText: 'setup current site\ntoggle hotkey',
                            hotkeyTextTemplate: 'toggle current site\n#HOTKEY',
                            style: 'status',
                            enabled: '{enabled}'
                        })
                    ]),
                    new xp.VBox({ flex: 'stretch', style: 'controlContainer' }, [
                        new Toggle({
                            value: '{enabled}'
                        }),
                        new HotkeyLink({
                            commandName: 'toggle',
                            noHotkeyText: 'setup extension\ntoggle hotkey',
                            hotkeyTextTemplate: 'toggle extension\n#HOTKEY',
                            style: 'status'
                        })
                    ])
                ]),

                //
                // ---- Tab panel ----

                new TabPanel({ onTabSwitched: (t) => t.tabName === 'Site list' && this.siteList.focus(), flex: 'stretch', enabled: '{enabled}' }, [

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
                        // Select font
                        new xp.VBox({ style: 'controlContainer' }, [
                            new xp.HBox({ style: 'line fontSelectContainer' }, [
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

                            new HotkeyLink({
                                commandName: 'addSite',
                                noHotkeyText: 'setup a hotkey for adding site',
                                hotkeyTextTemplate: 'hotkey for adding site: #HOTKEY',
                                style: 'description'
                            })
                        ])
                    ])

                ]),

                //
                // ---- Footer ----

                new xp.VBox({ name: 'footer', flex: 'none', itemsIndent: 'none' }, [
                    new xp.Html({
                        flex: 'none',
                        html: {
                            tag: 'p',
                            attrs: { class: 'description' },
                            children: [
                                'Some things should not be inverted?',
                                '\n',
                                'You can ',
                                { tag: 'strong', children: ['help and fix it'] },
                                ', here is a tool'
                            ]
                        },
                        enabled: '{enabled}'
                    }),
                    new xp.Button({
                        text: '🛠 Open developer tools',
                        onClick: () => this.devTools.isOpen = true
                    })
                ]),

                //
                // ---- Dev Tools ----

                new DevTools({
                    init: (dt) => this.devTools = dt,
                    isOpen: false,
                    inversionFixText: ext.getDevInversionFixesText(),
                    onApply: (text) => {
                        ext.applyDevInversionFixes(text, (err) => {
                            if (err) {
                                this.devTools.inversionFixErrorText = err.message;
                                // Todo: Highlight error.
                            } else {
                                this.devTools.inversionFixErrorText = '';
                                this.devTools.inversionFixText = ext.getDevInversionFixesText();
                            }
                        });
                    },
                    onReset: () => {
                        ext.resetDevInversionFixes();
                        this.devTools.inversionFixErrorText = '';
                        this.devTools.inversionFixText = ext.getDevInversionFixesText();
                    }
                })
            ]);

            this.initSiteToggleButton(this.siteToggle, ext);

            this.detectChromiumIssue750419();
        }

        private siteList: SiteList;
        private siteToggle: xp.Button;
        private devTools: DevTools;

        protected getTemplate() {
            // Clear body
            while (document.body.lastElementChild) {
                document.body.removeChild(
                    document.body.lastElementChild);
            }
            return super.getTemplate();
        }

        private initSiteToggleButton(btn: xp.Button, ext: Extension) {
            ext.getActiveTabInfo((info) => {
                // NOTE: Disable button if toggle has no effect.
                var toggleHasEffect = () => {
                    return (!info.isProtected
                        && !(!ext.config.invertListed
                            && info.isInDarkList));
                };
                btn.enabled = ext.enabled && toggleHasEffect();
                var changeReg = new xp.EventRegistrar();
                changeReg.subscribe(ext.onPropertyChanged, (prop) => {
                    if (prop === 'enabled') {
                        btn.enabled = ext.enabled && toggleHasEffect();
                    }
                });
                changeReg.subscribe(ext.config.onPropertyChanged, (prop) => {
                    if (prop === 'invertListed') {
                        btn.enabled = ext.enabled && toggleHasEffect();
                    }
                });
                this.onRemoved.addHandler(() => changeReg.unsubscribeAll());

                // Set button text
                if (info.host) {
                    // HACK: Try to break URLs at dots.
                    btn.text = '*';
                    const textElement = <HTMLElement>btn.domElement.querySelector('.text');
                    while (textElement.firstChild) {
                        textElement.removeChild(textElement.firstChild);
                    }
                    const hostParts = info.host.split('.');
                    hostParts.forEach((part, i) => {
                        if (i > 0) {
                            const wbr = document.createElement('wbr');
                            const dot = document.createTextNode('.');
                            textElement.appendChild(wbr);
                            textElement.appendChild(dot);
                        }
                        const text = document.createTextNode(part);
                        textElement.appendChild(text);
                    });
                } else {
                    btn.text = 'current site';
                }
            });
        }

        private detectChromiumIssue750419() {
            const agent = navigator.userAgent.toLowerCase();
            const m = agent.match(/chrom[e|ium]\/([^ ]+)/);
            if (m && m[1]) {
                const chromeVersion = m[1];
                const isWindows = navigator.platform.toLowerCase().indexOf('win') === 0;
                const isVivaldi = agent.indexOf('vivaldi') >= 0;
                const isYaBrowser = agent.indexOf('yabrowser') >= 0;
                const isOpera = agent.indexOf('opr') >= 0 || agent.indexOf('opera') >= 0;
                if (chromeVersion > '62.0.3167.0' && isWindows && !isVivaldi && !isYaBrowser && !isOpera) {
                    document.documentElement.classList.add('chromium-issue-750419');
                }
            }
        }
    }
}
