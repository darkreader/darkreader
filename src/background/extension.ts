import {configStore, isUrlInList, DEBUG, copyJson, handleInversionFixes} from './config_management';
import IconManager from './icon-manager';
import UserStorage from './user-storage';
import {getFontList, canInjectScript} from './utils';
import {formatJson} from '../config/utils';
import createCSSFilterStylesheet from '../generators/css-filter';
import {FilterConfig, TabInfo} from '../definitions';

export class Extension {

    enabled: boolean;
    config: FilterConfig;
    fonts: string[];
    icon: IconManager;
    user: UserStorage;

    constructor() {

        this.listeners = new Set();

        this.icon = new IconManager();
        this.user = new UserStorage();

        Promise.all([
            fetch('../inject/add-style.js')
                .then((res) => res.text())
                .then((text) => this.addStyleScript = text),
            fetch('../inject/remove-style.js')
                .then((res) => res.text())
                .then((text) => this.removeStyleScript = text),
        ]).then(() => {
            this.user.loadSettings()
                .then((settings) => {
                    if (settings.enabled) {
                        this.enable();
                    } else {
                        this.disable();
                    }
                    console.log('loaded', settings);
                    this.setConfig(settings.config);
                });
        })

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

        getFontList().then((fonts) => this.fonts = fonts);
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
        this.config = {...this.config, ...config};
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
                const {DARK_SITES} = configStore;
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
                callback({url: '', host: '', isProtected: false, isInDarkList: false});
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
                this.setConfig(Object.assign({}, this.config, {siteList}));
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

            this.icon.setActive();

            // Subscribe to tab updates
            this.addTabListeners();

            // Set style for active tabs
            chrome.tabs.query({active: true}, (tabs) => {
                tabs.forEach(this.addStyleToTab, this);
            });

            // Update style for other tabs
            chrome.tabs.query({active: false}, (tabs) => {
                tabs.forEach((tab) => {
                    setTimeout(() => this.addStyleToTab(tab), 0);
                });
            });

        } else {

            //
            // Switch OFF

            this.icon.setInactive();

            // Unsubscribe from tab updates
            this.removeTabListeners();

            // Remove style from active tabs
            chrome.tabs.query({active: true}, (tabs) => {
                tabs.forEach(this.removeStyleFromTab, this);
            });

            // Remove style from other tabs
            chrome.tabs.query({active: false}, (tabs) => {
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
            chrome.tabs.query({active: true}, (tabs) => {
                tabs.forEach(this.addStyleToTab, this);
            });

            // Update style for other tabs
            chrome.tabs.query({active: false}, (tabs) => {
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

    /**
     * Adds style to tab.
     */
    protected addStyleToTab(tab: chrome.tabs.Tab) {
        if (!canInjectScript(tab.url)) {
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
        if (!canInjectScript(tab.url)) {
            return;
        }
        chrome.tabs.executeScript(tab.id, {
            code: this.getCode_removeStyle()
        });
    }

    protected addStyleScript: string;
    protected removeStyleScript: string;

    protected getCode_addStyle(url?: string) {
        const css = createCSSFilterStylesheet(this.config, url);
        return this.addStyleScript
            .replace(/(^\s*)(\/\/\s*?#DEBUG\s*)(.*?$)/igm, DEBUG ? '$1$3' : '')
            .replace(/\$CSS/g, `'${css.replace(/\'/g, '\\\'')}'`);
    }

    protected getCode_removeStyle() {
        return this.removeStyleScript
            .replace(/(^\s*)(\/\/\s*?#DEBUG\s*)(.*?$)/igm, DEBUG ? '$1$3' : '');
    }

    protected saveUserSettings() {
        this.user.saveSetting({
            enabled: this.enabled,
            config: this.config,
        }).then((settings) => console.log('saved', settings));
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
        const {RAW_INVERSION_FIXES} = configStore;
        const fixes = this.getSavedDevInversionFixes();
        return formatJson(fixes ? JSON.parse(fixes) : copyJson(RAW_INVERSION_FIXES));
    }

    resetDevInversionFixes() {
        const {RAW_INVERSION_FIXES} = configStore;
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
