import {configStore, isUrlInList, DEBUG, copyJson, handleInversionFixes} from './config_management';
import {formatJson} from '../config/utils';
import { FilterCssGenerator, FilterMode } from './filter_css_generator';
import { FilterConfig, TabInfo } from '../definitions';

    const ICON_PATHS = {
        active_19: '../icons/dr_active_19.png',
        active_38: '../icons/dr_active_38.png',
        inactive_19: '../icons/dr_inactive_19.png',
        inactive_38: '../icons/dr_inactive_38.png'
    };

    const SAVE_CONFIG_TIMEOUT = 1000;

    /**
     * Chrome extension.
     * Extension uses CSS generator to process opened web pages.
     */
    export class Extension {

        protected generator: FilterCssGenerator;

        enabled: boolean;
        config: FilterConfig;
        fonts: string[];

        /**
         * Creates a chrome extensions.
         * @param generator CSS-generator.
         */
        constructor(generator: FilterCssGenerator) {
            this.generator = generator;

            this.listeners = new Set();

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
                    if (this.enabled) {
                        this.enable();
                    } else {
                        this.disable();
                    }
                }
                if (command === 'addSite') {
                    console.log('Add Site command entered');
                    this.toggleCurrentSite();
                }
            });

            // Load font list
            this.getFontList((fonts) => this.fonts = fonts);

            // TODO: Try to remove CSS before ext disabling or removal.
            window.addEventListener('unload', () => {
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach(this.removeStyleFromTab, this);
                });
            });
        }

        enable() {
            this.enabled = true;
            this.onAppToggle();
            this.invokeListeners();
        }

        disable() {
            this.enabled = false;
            this.onAppToggle();
            this.invokeListeners();
        }

        setConfig(config: FilterConfig) {
            this.config = Object.assign({}, this.config, config);
            this.onConfigPropChanged();
            this.invokeListeners();
        }

        protected listeners: Set<() => void>;

        addListener(callback: () => void) {
            this.listeners.add(callback);
        }

        removeListener(callback: () => void) {
            this.listeners.delete(callback);
        }

        protected invokeListeners() {
            this.listeners.forEach((listener) => listener());
        }

        /**
         * Returns info of active tab
         * of last focused window.
         */
        getActiveTabInfo(callback: (info: TabInfo) => void) {
            chrome.tabs.query({
                active: true,
                lastFocusedWindow: true
            }, (tabs) => {
                if (tabs.length === 1) {
                    const { DARK_SITES } = configStore;
                    const tab = tabs[0];
                    const url = tab.url;
                    const host = url.match(/^(.*?:\/{2,3})?(.+?)(\/|$)/)[2];
                    const info: TabInfo = {
                        url,
                        host,
                        isProtected: !canInjectScript(url),
                        isInDarkList: isUrlInList(url, DARK_SITES),
                    };
                    callback(info);
                } else {
                    if (DEBUG) {
                        throw new Error('Unexpected tabs count.');
                    }
                    console.error('Unexpected tabs count.');
                    callback({ url: '', host: '', isProtected: false, isInDarkList: false });
                }
            });
        }

        /**
         * Adds host name of last focused tab
         * into Sites List (or removes).
         */
        toggleCurrentSite() {
            this.getActiveTabInfo((info) => {
                if (info.host) {
                    const siteList = this.config.siteList.slice();
                    const index = siteList.indexOf(info.host);
                    if (index < 0) {
                        siteList.push(info.host);
                    } else {
                        // Remove site from list
                        siteList.splice(index, 1);
                    }
                    this.setConfig(Object.assign({}, this.config, { siteList }));
                }
            });
        }


        //------------------------------------
        //
        //       Handle config changes
        //

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
                this.addTabListeners();

                // Set style for active tabs
                chrome.tabs.query({ active: true }, (tabs) => {
                    tabs.forEach(this.addStyleToTab, this);
                });

                // Update style for other tabs
                chrome.tabs.query({ active: false }, (tabs) => {
                    tabs.forEach((tab) => {
                        setTimeout(() => this.addStyleToTab(tab), 0);
                    });
                });

            } else {

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
                this.removeTabListeners();

                // Remove style from active tabs
                chrome.tabs.query({ active: true }, (tabs) => {
                    tabs.forEach(this.removeStyleFromTab, this);
                });

                // Remove style from other tabs
                chrome.tabs.query({ active: false }, (tabs) => {
                    tabs.forEach((tab) => {
                        setTimeout(() => this.removeStyleFromTab(tab), 0);
                    });
                });
            }
            this.saveUserSettings();
        }

        protected onConfigPropChanged() {
            if (this.enabled) {
                // Update style for active tabs
                chrome.tabs.query({ active: true }, (tabs) => {
                    tabs.forEach(this.addStyleToTab, this);
                });

                // Update style for other tabs
                chrome.tabs.query({ active: false }, (tabs) => {
                    tabs.forEach((tab) => {
                        setTimeout(() => this.addStyleToTab(tab), 0);
                    });
                });
            }
            this.saveUserSettings();
        }


        //-------------------------
        //
        // Working with chrome tabs
        //
        //-------------------------

        protected addTabListeners() {
            if (!chrome.tabs.onUpdated.hasListener(this.tabUpdateListener)) {
                chrome.tabs.onUpdated.addListener(this.tabUpdateListener);
            }
            // Replace fires instead of update when page loaded from cache
            // https://bugs.chromium.org/p/chromium/issues/detail?id=109557
            // https://bugs.chromium.org/p/chromium/issues/detail?id=116379
            if (!chrome.tabs.onReplaced.hasListener(this.tabReplaceListener)) {
                chrome.tabs.onReplaced.addListener(this.tabReplaceListener);
            }
        }

        protected removeTabListeners() {
            chrome.tabs.onUpdated.removeListener(this.tabUpdateListener);
            chrome.tabs.onReplaced.removeListener(this.tabReplaceListener);
        }

        protected tabUpdateListener = (tabId: number, info: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
            console.log(`Tab updated: ${tab.id}, status: ${info.status}`);
            this.addStyleToTab(tab);
        };

        protected tabReplaceListener = (addedTabId: number, replacedTabId: number) => {
            console.log(`Tab ${replacedTabId} replaced with ${addedTabId}`);
            chrome.tabs.get(addedTabId, (tab) => this.addStyleToTab(tab));
        };


        //----------------------
        //
        // Add/remove css to tab
        //
        //----------------------

        protected canInjectScript(tab: chrome.tabs.Tab) {
            // Prevent throwing errors on specific chrome adresses
            return (tab && canInjectScript(tab.url));
        }

        /**
         * Adds style to tab.
         */
        protected addStyleToTab(tab: chrome.tabs.Tab) {
            if (!this.canInjectScript(tab)) {
                return;
            }
            chrome.tabs.executeScript(tab.id, {
                code: this.getCode_addStyle(tab.url),
                runAt: 'document_start'
            });
        }

        /**
         * Removes style from tab.
         */
        protected removeStyleFromTab(tab: chrome.tabs.Tab) {
            if (!this.canInjectScript(tab)) {
                return;
            }
            chrome.tabs.executeScript(tab.id, {
                code: this.getCode_removeStyle()
            });
        }

        protected getCode_addStyle(url?: string) {
            const css = this.generator.createCssCode(this.config, url);
            return `(function () {
${DEBUG ? "console.log('Executing DR script (add)...');" : ""}
var createDRStyle = function() {
    var css = '${css.replace(/'/g, '\\\'')}';
    var style = document.createElement('style');
    style.setAttribute('id', 'dark-reader-style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    return style;
};
if (document.head) {
    var style = createDRStyle();
    var prevStyle = document.getElementById('dark-reader-style');
    if (!prevStyle) {
        document.head.appendChild(style);
        ${DEBUG ? "console.log('Added DR style.');" : ""}
    } else if (style.textContent.replace(/^\\s*/gm, '') !== prevStyle.textContent.replace(/^\\s*/gm, '')) {
        prevStyle.parentElement.removeChild(prevStyle);
        document.head.appendChild(style);
        ${DEBUG ? "console.log('Updated DR style.');" : ""}
    }
} else {
    var drObserver = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].target.nodeName === 'HEAD') {
                drObserver.disconnect();
                document.removeEventListener('readystatechange', onReady);
                var prevStyle = document.getElementById('dark-reader-style');
                if (!prevStyle) {
                    var style = createDRStyle();
                    document.head.appendChild(style);
                    ${DEBUG ? "console.log('Added DR style using observer.');" : ""}
                }
                break;
            }
        }
    });
    drObserver.observe(document, { childList: true, subtree: true });
    var onReady = function() {
        if (document.readyState !== 'complete') { 
            return;
        }
        drObserver.disconnect();
        document.removeEventListener('readystatechange', onReady);
        if (!document.head) {
            var head = document.createElement('head');
            document.documentElement.insertBefore(head, document.documentElement.firstElementChild);
        }
        var prevStyle = document.getElementById('dark-reader-style');
        if (!prevStyle) {
            var style = createDRStyle();
            document.head.appendChild(style);
            ${DEBUG ? "console.log('Added DR style on document ready.');" : ""}
        }
    };
    document.addEventListener('readystatechange', onReady);
    if (document.readyState === 'complete') { 
        onReady();
    }
}
})()`;
        }

        protected getCode_removeStyle() {
            return `(function () {
${DEBUG ? "console.log('Executing DR script (remove)...');" : ""}
var style = document.getElementById('dark-reader-style');
style && style.parentElement.removeChild(style);
})();`;
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
            const defaultFilterConfig = Object.assign({}, configStore.DEFAULT_FILTER_CONFIG);
            var defaultStore: AppConfigStore = {
                enabled: true,
                config: defaultFilterConfig,
            };
            chrome.storage.sync.get(defaultStore, (store: AppConfigStore) => {
                if (!store.config) {
                    store.config = defaultFilterConfig;
                }
                if (!Array.isArray(store.config.siteList)) {
                    const arr = [];
                    for (let key in store.config.siteList) {
                        arr[key] = store.config.siteList[key];
                    }
                    store.config.siteList = arr;
                }
                this.setConfig(Object.assign({}, store.config));
                if (store.enabled) {
                    this.enable();
                } else {
                    this.disable();
                }
                console.log('loaded', store);
            });
        }

        /**
         * Saves configuration to Chrome storage.
         */
        protected saveUserSettings() {
            // NOTE: Debounce config saving.
            if (this.savedTimeout) {
                clearTimeout(this.savedTimeout);
            }
            this.savedTimeout = setTimeout(() => {
                const store: AppConfigStore = {
                    enabled: this.enabled,
                    config: this.config,
                };
                chrome.storage.sync.set(store, () => {
                    console.log('saved', store);
                    this.savedTimeout = null;
                });
            }, SAVE_CONFIG_TIMEOUT);
        }
        private savedTimeout: number;

        /**
         * Returns the list of fonts
         * installed in system.
         */
        protected getFontList(onReturned: (fonts: string[]) => void) {
            if (!chrome.fontSettings) {
                // Todo: Remove it as soon as Firefox and Edge get support.
                setTimeout(() => onReturned([
                    'serif',
                    'sans-serif',
                    'monospace',
                    'cursive',
                    'fantasy',
                    'system-ui'
                ]));
                return;
            }
            chrome.fontSettings.getFontList((res) => {
                // id or name?
                const fonts = res.map((r) => r.fontId);
                onReturned(fonts);
            });
        }


        //-------------------------------------
        //
        //          Developer tools
        //
        //-------------------------------------

        protected getSavedDevInversionFixes() {
            return localStorage.getItem('dev_inversion_fixes') || null;
        }

        protected saveDevInversionFixes(json: string) {
            localStorage.setItem('dev_inversion_fixes', json);
        }

        getDevInversionFixesText() {
            const { RAW_INVERSION_FIXES } = configStore; 
            const fixes = this.getSavedDevInversionFixes();
            return formatJson(fixes ? JSON.parse(fixes) : copyJson(RAW_INVERSION_FIXES));
        }

        resetDevInversionFixes() {
            const { RAW_INVERSION_FIXES } = configStore; 
            localStorage.removeItem('dev_inversion_fixes');
            handleInversionFixes(copyJson(RAW_INVERSION_FIXES));
            this.onConfigPropChanged();
        }

        applyDevInversionFixes(json: string, callback: (err: Error) => void) {
            let obj;
            try {
                obj = JSON.parse(json);
                const text = formatJson(obj);
                this.saveDevInversionFixes(text);
                handleInversionFixes(obj);
                this.onConfigPropChanged();
                callback(null);
            } catch (err) {
                callback(err);
            }
        }
    }

    function canInjectScript(url: string) {
        return url
            && url.indexOf('chrome') !== 0
            && url.indexOf('https://chrome.google.com/webstore') !== 0
            && url.indexOf('about:') !== 0
            && url.indexOf('view-source:') !== 0
            && url.indexOf('https://addons.mozilla.org') !== 0
    }

    //
    // --------- Interfaces --------------

    interface AppConfigStore {
        enabled: boolean;
        config: FilterConfig;
    }
