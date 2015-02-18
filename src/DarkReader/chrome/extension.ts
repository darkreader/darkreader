module DarkReader.Chrome {

    /**
     * Chrome extension.
     * Extension uses CSS generator to process opened web pages.
     */
    export class Extension<TConfig> extends Application<TConfig> {

        protected generator: Generation.ICssGenerator<TConfig>;

        /**
         * Creates a chrome extensions.
         * @param config Default application configuration.
         * @param generator CSS-generator.
         */
        constructor(config: TConfig, generator: Generation.ICssGenerator<TConfig>) {
            super(config);

            this.generator = generator;

            // Default icon
            chrome.browserAction.setIcon({
                path: {
                    '19': this.iconPaths.inactive_19,
                    '38': this.iconPaths.inactive_19
                }
            });

            this.onToggle.addHandler(this.onAppToggle, this);
            this.onConfigSetup.addHandler(this.onSetConfig, this);

            // Load saved configuration from Chrome storage
            this.loadStore();

            // Save config and state on any change
            this.onToggle.addHandler((enabled) => {
                this.saveStore();
            }, this);
            this.onConfigSetup.addHandler((config) => {
                this.saveStore();
            }, this);

            // Subscribe on keyboard shortcut
            chrome.commands.onCommand.addListener((command) => {
                if (command === 'toggle') {
                    console.log('toggle command entered');
                    this.toggle();
                }
            });

            // TODO: Try to remove CSS before ext disabling or removal.
            window.onbeforeunload = (e) => {
                this.onAppToggle(false); // Nothing happens
            };
        }


        //--------------
        // Switch ON/OFF
        //--------------

        protected onAppToggle(isEnabled: boolean) {
            if (isEnabled) {
                //
                // Switch ON

                // Change icon
                chrome.browserAction.setIcon({
                    path: {
                        '19': this.iconPaths.active_19,
                        '38': this.iconPaths.active_38
                    }
                });

                // Subscribe to tab updates
                this.addTabListener();

                // Set style for current tab
                chrome.tabs.getCurrent((t) => { this.addCssToTab(t) });

                // Set style for all tabs
                chrome.tabs.query({},(tabs) => {
                    tabs.forEach((tab) => {
                        this.addCssToTab(tab);
                    });
                });
            }
            else {
                //
                // Switch OFF

                // Change icon
                chrome.browserAction.setIcon({
                    path: {
                        '19': this.iconPaths.inactive_19,
                        '38': this.iconPaths.inactive_38
                    }
                });

                // Unsubscribe from tab updates
                this.removeTabListener();

                // Remove style from current tab
                this.removeCssFromTab(null);

                // Remove style from all tabs
                chrome.tabs.query({},(tabs) => {
                    tabs.forEach((tab) => {
                        this.removeCssFromTab(tab);
                    });
                });
            }
        }

        protected onSetConfig(config: TConfig) {
            if (this.isEnabled) {
                // Update style for current tab
                chrome.tabs.getCurrent((t) => { this.updateCssInTab(t) });

                // Update style for all tabs
                chrome.tabs.query({},(tabs) => {
                    tabs.forEach((tab) => {
                        this.updateCssInTab(tab);
                    });
                });
            }
        }


        //-------------------------
        // Working with chrome tabs
        //-------------------------

        protected addTabListener() {
            if (chrome.tabs.onUpdated.hasListener(this.tabUpdateListener)) {
                console.log('Tab listener is already present.');
            }
            else {
                chrome.tabs.onUpdated.addListener(this.tabUpdateListener);
                console.log('Tab listener added.');
            }
        }

        protected removeTabListener() {
            chrome.tabs.onUpdated.removeListener(this.tabUpdateListener);
            console.log('Tab listener removed.');
        }

        protected tabUpdateListener = (tabId: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
            console.log('Tab: ' + tab.id + ', status: ' + info.status);

            if (/*info.status === 'loading'*/true) {
                //if (info.status === 'loading' || info.status === 'complete') {
                this.addCssToTab(tab);
            }
        }


        //----------------------
        // Add/remove css to tab
        //----------------------

        /**
         * Adds CSS to tab.
         * @param tab If null than current tab will be processed.
         */
        protected addCssToTab(tab: chrome.tabs.Tab) {
            // Prevent throwing errors on specific chrome adresses
            if (tab && tab.url && (tab.url.indexOf('chrome') === 0)) {
                return;
            }

            if (tab) { // Somewhere null is called.
                var id = tab ? tab.id : null;
                var url = tab ? tab.url : '';
                chrome.tabs.executeScript(id, {
                    code: this.getCode_addCss(url),
                    runAt: 'document_start'
                });
            }
        }

        /**
         * Removes CSS from tab.
         * @param tab If null than current tab will be processed.
         */
        protected removeCssFromTab(tab: chrome.tabs.Tab) {
            // Prevent throwing errors on specific chrome adresses
            if (tab && tab.url && (tab.url.indexOf('chrome') === 0)) {
                return;
            }

            var id = tab ? tab.id : null;
            chrome.tabs.executeScript(id, {
                code: this.getCode_removeCss()
            });
        }

        /**
         * Updates CSS in tab.
         * @param tab If null than current tab will be processed.
         */
        protected updateCssInTab(tab: chrome.tabs.Tab) {
            // Prevent throwing errors on specific chrome adresses
            if (tab && tab.url && (tab.url.indexOf('chrome') === 0)) {
                return;
            }

            if (tab) { // Somewhere null is called.
                var id = tab ? tab.id : null;
                var url = tab ? tab.url : '';
                chrome.tabs.executeScript(id, {
                    code: this.getCode_updateCss(url),
                    runAt: 'document_start'
                });
            }
        }

        protected getCode_addCss(url?: string) {
            var css = this.generator.createCssCode(this.config, url);

            //var code = "alert('Add CSS');"
            var code = [
                "console.log('Executing DR script (add)...');",
            //"debugger;",
                "var addDRStyle = function() {",
                "   var css = '" + css + "';",
                "   var style = document.createElement('style');",
                "   style.setAttribute('id', 'dark-reader-style');",
                "   style.type = 'text/css';",
                "   style.appendChild(document.createTextNode(css));",
                "   var heads = document.getElementsByTagName('head');",
                "   var head;",
                "   if (heads && heads[0]) {",
                "       head = heads[0];",
                "   } else {",
                "       var html = document.children[0];",
                "       head = document.createElement('head');",
                "       if (html.children.length > 0)",
                "           html.insertBefore(head, html.firstChild);",
                "       else",
                "           html.appendChild(head);",
                "   }",
                "   head.appendChild(style);",
                "}",
                "var head = document.getElementsByTagName('head')[0];",
                "if (head) {",
                "   var prevStyle = document.getElementById('dark-reader-style');",
                "   if (!prevStyle) {",
                "       addDRStyle();",
                "       console.log('Added DR style.');",
                "   }",
                "}",
                "else {",
                "   (function () {",
                "       addDRStyle();",
                "       console.log('Added DR style without head.');",
                "       var dr_observer = new MutationObserver(function (mutations) {",
                "           for (var i = 0; i < mutations.length; i++) {",
                "               if (mutations[i].target.nodeName == 'BODY' || mutations[i].target.nodeName == 'HEAD') {",
                "                   dr_observer.disconnect();",
                "                   var prevStyle = document.getElementById('dark-reader-style');",
                "                   if (!prevStyle) {",
                "                       addDRStyle();",
                "                       console.log('Added DR style using observer.');",
                "                   }",
                "                   break;",
                "               }",
                "           }",
                "       });",
                "       dr_observer.observe(document, { childList: true, subtree: true });",
                "       var fn = function() {",
                "           if (document.readyState === 'complete') {",
                "               var prevStyle = document.getElementById('dark-reader-style');",
                "               if (!prevStyle) {",
                "                   addDRStyle();",
                "                   console.log('Added DR style on load.');",
                "               }",
                "           }",
                "           document.removeEventListener('readystatechange', fn);",
                "       };",
                "       document.addEventListener('readystatechange', fn);",
                "   })();",
                "}"
            ].join('\n');

            return code;
        }

        protected getCode_removeCss() {
            //var code = "alert('Remove CSS');"
            var code =
                "console.log('Executing DR script (remove)...');\n" +
                "var style = document.getElementById('dark-reader-style');\n" +
                "style && style.parentNode.removeChild(style);";

            return code;
        }

        protected getCode_updateCss(url?: string) {
            var css = this.generator.createCssCode(this.config, url);

            //var code = "alert('Update CSS');"
            var code = [
                "console.log('Executing DR script (update)...');",
                "var addDRStyle = function() {",
                "   var css = '" + css + "';",
                "   var style = document.createElement('style');",
                "   style.setAttribute('id', 'dark-reader-style');",
                "   style.type = 'text/css';",
                "   style.appendChild(document.createTextNode(css));",
                "   var head = document.getElementsByTagName('head')[0];",
                "   head.appendChild(style);",
                "}",
                "var head = document.getElementsByTagName('head')[0];",
                "if (head) {",
                "   var prevStyle = document.getElementById('dark-reader-style');",
                "   if (prevStyle) {",
                "       prevStyle.parentElement.removeChild(prevStyle);",
                "   }",
                "   addDRStyle();",
                "   console.log('Updated DR style.');",
                "}"
            ].join('\n');

            return code;
        }

        iconPaths = {
            active_19: 'img/dr_active_19.png',
            active_38: 'img/dr_active_38.png',
            inactive_19: 'img/dr_inactive_19.png',
            inactive_38: 'img/dr_inactive_38.png'
        }


        //-------------------------
        // Configuration management
        //-------------------------

        /**
         * Loads configuration from Chrome storage.
         */
        protected loadStore() {
            var defaultStore: AppConfigStore<TConfig> = {
                enabled: false,
                config: this.config
            };
            chrome.storage.sync.get(defaultStore,(store: AppConfigStore<TConfig>) => {
                if (store.enabled) {
                    this.enable();
                }
                else {
                    this.disable();
                }
                this.config = store.config;
                console.log('loaded:');
                console.log(store);
            });
        }

        /**
         * Saves configuration to Chrome storage.
         */
        protected saveStore() {
            var store: AppConfigStore<TConfig> = {
                enabled: this.isEnabled,
                config: this.config
            };
            chrome.storage.sync.set(store,() => {
                console.log('saved:');
                console.log(store);
            });
        }
    }
} 