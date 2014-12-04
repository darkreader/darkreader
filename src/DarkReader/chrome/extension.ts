module DarkReader.Chrome {

    /**
     * Chrome extension base.
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
                path: this.iconPaths.inactive
            });

            this.onSwitch.addHandler(this.onAppSwitch, this);

            // Load saved configuration from Chrome storage
            this.loadStore();

            // Save config and state on any change
            this.onSwitch.addHandler((enabled) => {
                this.saveStore();
            }, this);
            this.onConfigSetup.addHandler((config) => {
                this.saveStore();
            }, this);
        }


        //--------------
        // Switch ON/OFF
        //--------------

        protected onAppSwitch(isEnabled: boolean) {
            if (isEnabled) {
                //
                // Switch ON

                // Change icon
                chrome.browserAction.setIcon({
                    path: this.iconPaths.active
                });

                // Subscribe to tab updates
                this.addTabListener();

                // Set style for current tab
                chrome.tabs.getCurrent((t) => { this.addCssToTab(t) });

                // Set style for all tabs
                chrome.tabs.query({}, (tabs) => {
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
                    path: this.iconPaths.inactive
                });

                // Unsubscribe from tab updates
                this.removeTabListener();

                // Remove style from current tab
                this.removeCssFromTab(null);

                // Remove style from all tabs
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach((tab) => {
                        this.removeCssFromTab(tab);
                    });
                });
            }
        }


        //-------------------------
        // Working with chrome tabs
        //-------------------------

        protected addTabListener() {
            chrome.tabs.onUpdated.addListener(this.tabUpdateListener);
        }

        protected removeTabListener() {
            chrome.tabs.onUpdated.removeListener(this.tabUpdateListener);
        }

        protected tabUpdateListener = (tabId: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
            console.log('Tab: ' + tab.id + ', status: ' + info.status);

            if (info.status === 'loading') {
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

        protected getCode_addCss(url?: string) {
            var css = this.generator.createCssCode(this.config, url);

            //var code = "alert('Add CSS');"
            var code = [
                "console.log('Executing DR script...');",
                "var addDRStyle = addDRStyle || function() {",
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
                "   if (!prevStyle) {",
                "       addDRStyle();",
                "       console.log('Added DR style.');",
                "   }",
                "}",
                "else if (!dr_observer) {",
                "   var dr_observer = new MutationObserver(function (mutations) {",
                "       mutations.forEach(function (mutation) {",
                "           if (mutation.target.nodeName == 'BODY' || mutation.target.nodeName == 'HEAD') {",
                "               dr_observer.disconnect();",
                "               var prevStyle = document.getElementById('dark-reader-style');",
                "               if (!prevStyle) {",
                "                   addDRStyle();",
                "                   console.log('Added DR style using observer.');",
                "               }",
                "           }",
                "       });",
                "   });",
                "   dr_observer.observe(document, { childList: true, subtree: true });",
                "}"
            ].join('\n');

            return code;
        }

        protected getCode_removeCss() {
            //var code = "alert('Remove CSS');"
            var code =
                "var style = document.getElementById('dark-reader-style');\n" +
                "style && style.parentNode.removeChild(style);";

            return code;
        }

        iconPaths = {
            active: 'img/dr_active_19.png',
            inactive: 'img/dr_inactive_19.png'
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
            chrome.storage.sync.get(defaultStore, (store: AppConfigStore<TConfig>) => {
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
            chrome.storage.sync.set(store, () => {
                console.log('saved:');
                console.log(store);
            });
        }
    }
} 