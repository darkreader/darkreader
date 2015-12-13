module DarkReader {

    /**
     * Chrome extension.
     * Extension uses CSS generator to process opened web pages.
     */
    export class Extension extends xp.Model {

        protected generator: FilterCssGenerator;
        enabled: boolean;
        config: ObservableFilterConfig;
        fonts: string[];

        /**
         * Creates a chrome extensions.
         * @param generator CSS-generator.
         */
        constructor(generator: FilterCssGenerator) {
            super();
            this.generator = generator;

            // Define properties
            xp.Model.property(this, 'enabled', false);
            xp.Model.property(this, 'config', null);
            xp.Model.property(this, 'fonts', []);

            // Handle config changes
            var prevEnabled = false;
            this.onPropertyChanged.addHandler((prop) => {
                if (prop === 'enabled') {
                    if (prevEnabled !== this.enabled) {
                        this.onAppToggle();
                        this.saveUserSettings();
                    }
                    prevEnabled = this.enabled;
                }
                if (prop === 'config') {
                    var onCfgPropChange = () => {
                        // TODO: Handle more precise changes (eg: if site
                        // added to list -> process only this site, but
                        // not all the tabs).
                        this.onConfigPropChanged();
                        this.saveUserSettings();
                    };
                    this.config.onPropertyChanged.addHandler(onCfgPropChange);
                    this.config.siteList.onCollectionChanged.addHandler(onCfgPropChange);
                }
            });

            // Default icon
            chrome.browserAction.setIcon({
                path: {
                    '19': ICON_PATHS.inactive_19,
                    '38': ICON_PATHS.inactive_38
                }
            });

            // Load user settings from Chrome storage
            this.loadUserSettings();

            // Subscribe on keyboard shortcut
            chrome.commands.onCommand.addListener((command) => {
                if (command === 'toggle') {
                    console.log('Toggle command entered');
                    this.enabled = !this.enabled;
                }
                if (command === 'addSite') {
                    console.log('Add Site command entered');
                    this.toggleCurrentSite();
                }
            });

            // Load font list
            this.getFontList((fonts) => this.fonts = fonts);

            // TODO: Try to remove CSS before ext disabling or removal.
            
            // Get active tab
            // Get active tab from tast focused window
            chrome.tabs.query({
                active: true,
                lastFocusedWindow: true
            }, (tabs) => {
                if (tabs.length === 1) {
                    this.activeTab = tabs[0];
                } else {
                    throw new Error('Unexpected active tabs count.');
                }
                // WARNING: Noticed bug: when calling
                // command from Popup page, tabs==[],
                // but currently is not reproducable.
            });
            chrome.tabs.onActivated.addListener((info) => {
                chrome.tabs.get(info.tabId, (t) => {
                    this.activeTab = t;
                });
            });
        }

        protected activeTab: chrome.tabs.Tab;


        //-----------------------
        //     Switch ON/OFF

        protected onAppToggle() {
            if (this.enabled) {
                //
                // Switch ON

                // Change icon
                chrome.browserAction.setIcon({
                    path: {
                        '19': ICON_PATHS.active_19,
                        '38': ICON_PATHS.active_38
                    }
                });

                // Subscribe to tab updates
                this.addTabListener();
                
                // Set style for active tabs
                chrome.tabs.query({ active: true }, (tabs) => {
                    tabs.forEach((tab) => {
                        this.addCssToTab(tab);
                    });
                });

                // Set style for all tabs
                chrome.tabs.query({ active: false }, (tabs) => {
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
                        '19': ICON_PATHS.inactive_19,
                        '38': ICON_PATHS.inactive_38
                    }
                });

                // Unsubscribe from tab updates
                this.removeTabListener();

                // Remove style from active tabs
                chrome.tabs.query({ active: true }, (tabs) => {
                    tabs.forEach((tab) => {
                        this.removeCssFromTab(tab);
                    });
                });

                // Remove style from all tabs
                chrome.tabs.query({ active: false }, (tabs) => {
                    tabs.forEach((tab) => {
                        this.removeCssFromTab(tab);
                    });
                });
            }
        }

        /**
         * Returns info of active tab
         * of last focused window.
         */
        getActiveTabInfo(callback: (res: { url: string; host: string; isChromePage: boolean; isInDarkList: boolean; }) => void) {
            var url = this.activeTab.url;
            var host = url.match(/^(.*?:\/{2,3})?(.+?)(\/|$)/)[2];
            var result = {
                url: url,
                host: host,
                isChromePage: (url.indexOf('chrome://') === 0 || url.indexOf('https://chrome.google.com/webstore') === 0),
                isInDarkList: isUrlInList(url, DARK_SITES)
            };
            callback(result);
        }

        /**
         * Adds host name of last focused tab
         * into Sites List (ore removes).
         */
        toggleCurrentSite() {
            this.getActiveTabInfo((info) => {
                if (info.host) {
                    var index = this.config.siteList.indexOf(info.host);
                    if (index < 0) {
                        this.config.siteList.push(info.host);
                    } else {
                        // Remove site from list
                        this.config.siteList.splice(index, 1);
                    }
                }
            });
        }

        protected onConfigPropChanged() {
            if (this.enabled) {
                // Update style for current tab
                chrome.tabs.query({ active: true }, (tabs) => {
                    tabs.forEach((tab) => {
                        this.updateCssInTab(tab);
                    });
                });

                // Update style for all tabs
                chrome.tabs.query({ active: false }, (tabs) => {
                    tabs.forEach((tab) => {
                        this.updateCssInTab(tab);
                    });
                });
            }
        }


        //-------------------------
        //
        // Working with chrome tabs
        //
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
        //
        // Add/remove css to tab
        //
        //----------------------
        
        protected canInjectScript(tab: chrome.tabs.Tab) {
            // Prevent throwing errors on specific chrome adresses
            return !(tab
                && tab.url
                && tab.url.indexOf('chrome') === 0
                && tab.url.indexOf('https://chrome.google.com/webstore') === 0
            );
        }

        /**
         * Adds CSS to tab.
         * @param tab If null than current tab will be processed.
         */
        protected addCssToTab(tab: chrome.tabs.Tab) {
            if (!this.canInjectScript(tab)) {
                return;
            }
            chrome.tabs.executeScript(tab.id, {
                code: this.getCode_addCss(tab.url),
                runAt: 'document_start'
            });
        }

        /**
         * Removes CSS from tab.
         * @param tab If null than current tab will be processed.
         */
        protected removeCssFromTab(tab: chrome.tabs.Tab) {
            if (!this.canInjectScript(tab)) {
                return;
            }
            chrome.tabs.executeScript(tab.id, {
                code: this.getCode_removeCss()
            });
        }

        /**
         * Updates CSS in tab.
         * @param tab If null than current tab will be processed.
         */
        protected updateCssInTab(tab: chrome.tabs.Tab) {
            if (!this.canInjectScript(tab)) {
                return;
            }
            chrome.tabs.executeScript(tab.id, {
                code: this.getCode_updateCss(tab.url),
                runAt: 'document_start'
            });
        }

        protected getCode_addCss(url?: string) {
            var css = this.generator.createCssCode(this.config, url);

            //var code = "alert('Add CSS');"
            var code = `
${DEBUG ? "console.log('Executing DR script (add)...');" : ""}
//debugger;
var addDRStyle = function() {
    var css = '${css}';
    var style = document.createElement('style');
    style.setAttribute('id', 'dark-reader-style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    var head = document.querySelector('head');
    if (!head) {
        var html = document.querySelector('html');
        head = document.createElement('head');
        if (html.childElementCount > 0) {
            html.insertBefore(head, html.firstElementChild);
        } else {
            html.appendChild(head);
        }
    }
    head.appendChild(style);
};
var head = document.querySelector('head');
if (head) {
    var prevStyle = document.getElementById('dark-reader-style');
    if (!prevStyle) {
        addDRStyle();
        ${DEBUG ? "console.log('Added DR style.');" : ""}
    }
} else {
    (function() {
        addDRStyle();
        ${DEBUG ? "console.log('Added DR style without head.');" : ""}
        var dr_observer = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].target.nodeName == 'BODY' || mutations[i].target.nodeName == 'HEAD') {
                    dr_observer.disconnect();
                    var prevStyle = document.getElementById('dark-reader-style');
                    if (!prevStyle) {
                        addDRStyle();
                        ${DEBUG ? "console.log('Added DR style using observer.');" : ""}
                    }
                    break;
                }
            }
        });
        dr_observer.observe(document, { childList: true, subtree: true });
        var fn = function() {
            var prevStyle = document.getElementById('dark-reader-style');
            if (!prevStyle) {
                addDRStyle();
                ${DEBUG ? "console.log('Added DR style on load.');" : ""}
            }
            document.removeEventListener('readystatechange', fn);
        };
        document.addEventListener('readystatechange', fn);
    })();
}
`;
            return code;
        }

        protected getCode_removeCss() {
            //var code = "alert('Remove CSS');"
            var code = `
${DEBUG ? "console.log('Executing DR script (remove)...');" : ""}
var style = document.getElementById('dark-reader-style');
style && style.parentNode.removeChild(style);
`;
            return code;
        }

        protected getCode_updateCss(url?: string) {
            var css = this.generator.createCssCode(this.config, url);

            //var code = "alert('Update CSS');"
            var code = `
${DEBUG ? "console.log('Executing DR script (update)...');" : ""}
var addDRStyle = function() {
    var css = '${css}';
    var style = document.createElement('style');
    style.setAttribute('id', 'dark-reader-style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    var head = document.querySelector('head');
    head.appendChild(style);
}
var head = document.querySelector('head');
if (head) {
    var prevStyle = document.getElementById('dark-reader-style');
    if (prevStyle) {
        prevStyle.parentElement.removeChild(prevStyle);
    }
    addDRStyle();
    ${DEBUG ? "console.log('Updated DR style.');" : ""}
}
`;
            return code;
        }


        //-------------------------------------
        //
        //       Configuration management
        //
        //-------------------------------------

        /**
         * Loads configuration from Chrome storage.
         */
        protected loadUserSettings() {
            var defaultFilterConfig = xp.clone(DEFAULT_FILTER_CONFIG);
            var defaultStore: AppConfigStore = {
                enabled: true,
                config: defaultFilterConfig
            };
            // Read legacy config
            chrome.storage.sync.get({
                config: <ObsoleteFilterConfig>{
                    fontfamily: null,
                    ignorelist: null,
                    textstroke: null,
                    usefont: null
                }
            }, (store: { config: ObsoleteFilterConfig }) => {
                if (store.config) {
                    if (store.config.fontfamily !== null) {
                        defaultFilterConfig.fontFamily = store.config.fontfamily;
                    }
                    if (store.config.ignorelist !== null) {
                        defaultFilterConfig.siteList = store.config.ignorelist;
                    }
                    if (store.config.textstroke !== null) {
                        defaultFilterConfig.textStroke = store.config.textstroke;
                    }
                    if (store.config.usefont !== null) {
                        defaultFilterConfig.useFont = store.config.usefont;
                    }
                }
                console.log('loaded legacy config:');
                console.log(store);

                chrome.storage.sync.get(defaultStore, (store: AppConfigStore) => {
                    if (!store.config) {
                        store.config = defaultFilterConfig;
                    }
                    if (!Array.isArray(store.config.siteList)) {
                        var arr = [];
                        for (var key in store.config.siteList) {
                            arr[key] = store.config.siteList[key];
                        }
                        store.config.siteList = arr;
                    }
                    this.config = <ObservableFilterConfig>xp.observable(store.config);
                    this.enabled = store.enabled;
                    console.log('loaded:');
                    console.log(store);
                });
            });
        }

        /**
         * Saves configuration to Chrome storage.
         */
        protected saveUserSettings() {
            var store: AppConfigStore = {
                enabled: this.enabled,
                config: this.config
            };
            chrome.storage.sync.set(store, () => {
                console.log('saved:');
                console.log(store);
            });
        }

        //---------------------------
        //   Getting the font list
        //---------------------------

        protected getFontList(onReturned: (fonts: string[]) => void) {
            chrome.fontSettings.getFontList((res) => {
                // id or name?
                var fonts = res.map((r) => r.fontId);
                onReturned(fonts);
            });
        }
    }

    var ICON_PATHS = {
        active_19: '../img/dr_active_19.png',
        active_38: '../img/dr_active_38.png',
        inactive_19: '../img/dr_inactive_19.png',
        inactive_38: '../img/dr_inactive_38.png'
    }

    interface AppConfigStore {
        enabled: boolean;
        config: FilterConfig;
    }

    export interface ObservableFilterConfig extends FilterConfig, xp.Notifier {
        siteList: xp.ObservableCollection<string>;
    }
}
