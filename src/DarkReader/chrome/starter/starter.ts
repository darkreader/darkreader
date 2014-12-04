module DarkReader.Chrome {
    /**
     * Basic Chrome extension with no settings and settings-view.
     * Extension uses CSS generator to process document.
     */
    export /*sealed*/ class StarterExtension extends Application<{}> {

        private generator: Generation.ICssGenerator<{}>;

        /**
         * Creates a basic chrome extension with no settings.
         * @param generator CSS-generator with no configuration.
         */
        constructor(generator: Generation.ICssGenerator<{}>) {
            super({});

            this.generator = generator;

            this.onSwitch.addHandler(this.onAppSwitch, this);
        }


        //--------------
        // Switch ON/OFF
        //--------------

        private onAppSwitch(isEnabled: boolean) {
            if (isEnabled) {
                //
                // Switch ON

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

        private addTabListener() {
            chrome.tabs.onUpdated.addListener(this.tabUpdateListener);
        }

        private removeTabListener() {
            chrome.tabs.onUpdated.removeListener(this.tabUpdateListener);
        }

        private tabUpdateListener = (tabId: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
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
        private addCssToTab(tab: chrome.tabs.Tab) {
            //// Prevent throwing errors on specific chrome adresses
            //if (tab && tab.url && (tab.url.indexOf('chrome') === 0)) {
            //    return;
            //}

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
        private removeCssFromTab(tab: chrome.tabs.Tab) {
            // Prevent throwing errors on specific chrome adresses
            if (tab && tab.url && (tab.url.indexOf('chrome') === 0)) {
                return;
            }

            var id = tab ? tab.id : null;
            chrome.tabs.executeScript(id, {
                code: this.getCode_removeCss()
            });
        }

        private getCode_addCss(url?: string) {
            var css = this.generator.createCssCode({}, url);

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

        private getCode_removeCss() {
            //var code = "alert('Remove CSS');"
            var code =
                "var style = document.getElementById('dark-reader-style');\n" +
                "style && style.parentNode.removeChild(style);";

            return code;
        }
    }
}