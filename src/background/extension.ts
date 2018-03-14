import ConfigManager from './config-manager';
import IconManager from './icon-manager';
import Messenger from './messenger';
import UserStorage from './user-storage';
import {simpleClone, getFontList, canInjectScript, isUrlInList, getUrlHost} from './utils';
import {formatJson} from '../config/utils';
import createCSSFilterStylesheet from '../generators/css-filter';
import {FilterConfig, TabInfo, ExtensionData} from '../definitions';

export class Extension {

    enabled: boolean;
    ready: boolean;
    config: ConfigManager;
    filterConfig: FilterConfig;
    fonts: string[];
    icon: IconManager;
    messenger: Messenger;
    user: UserStorage;

    constructor() {
        this.ready = false;

        this.icon = new IconManager();
        this.config = new ConfigManager();
        this.messenger = new Messenger({
            collect: () => this.collectData(),
            getActiveTabInfo: async () => await this.getActiveTabInfo(),
            enable: () => this.enable(),
            disable: () => this.disable(),
            setConfig: (config) => this.setConfig(config),
            toggleSitePattern: (pattern) => this.toggleSitePattern(pattern),
            applyDevInversionFixes: (json) => this.applyDevInversionFixes(json),
            resetDevInversionFixes: () => this.resetDevInversionFixes(),
        });

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
    }

    async start() {
        const loadInjections = async () => {
            const loadAddStyleScript = async () => {
                const res = await fetch('../inject/add-style.js');
                const text = await res.text();
                this.addStyleScript = text;
            };
            const loadRemoveStyleScript = async () => {
                const res = await fetch('../inject/remove-style.js');
                const text = await res.text();
                this.removeStyleScript = text;
            };
            await Promise.all([
                loadAddStyleScript(),
                loadRemoveStyleScript(),
            ]);
        };

        const loadFonts = async () => {
            const fonts = await getFontList();
            this.fonts = fonts;
        };

        await Promise.all([
            loadInjections(),
            this.config.load(),
            loadFonts(),
        ]);

        this.user = new UserStorage({defaultFilterConfig: this.config.DEFAULT_FILTER_CONFIG});
        const settings = await this.user.loadSettings();
        if (settings.enabled) {
            this.enable();
        } else {
            this.disable();
        }
        console.log('loaded', settings);
        this.ready = true;
        this.setConfig(settings.config);
    }

    private collectData(): ExtensionData {
        return {
            enabled: this.enabled,
            filterConfig: this.filterConfig,
            ready: this.ready,
            fonts: this.fonts,
            devInversionFixesText: this.getDevInversionFixesText(),
        };
    }

    enable() {
        this.enabled = true;
        this.onAppToggle();
    }

    disable() {
        this.enabled = false;
        this.onAppToggle();
    }

    setConfig(config: FilterConfig) {
        this.filterConfig = {...this.filterConfig, ...config};
        this.onConfigPropChanged();
    }

    private reportChanges() {
        const info = this.collectData();
        this.messenger.reportChanges(info);
    }

    getActiveTabInfo() {
        return new Promise<TabInfo>((resolve) => {
            chrome.tabs.query({
                active: true,
                lastFocusedWindow: true
            }, ([tab]) => {
                const {DARK_SITES} = this.config;
                const url = tab.url;
                resolve({
                    url: tab.url,
                    isProtected: !canInjectScript(url),
                    isInDarkList: isUrlInList(url, DARK_SITES),
                });
            });
        });
    }

    toggleSitePattern(pattern: string) {
        const siteList = this.filterConfig.siteList.slice();
        const index = siteList.indexOf(pattern);
        if (index < 0) {
            siteList.push(pattern);
        } else {
            siteList.splice(index, 1);
        }
        this.setConfig(Object.assign({}, this.filterConfig, {siteList}));
    }

    /**
     * Adds host name of last focused tab
     * into Sites List (or removes).
     */
    async toggleCurrentSite() {
        const {url} = await this.getActiveTabInfo();
        const host = getUrlHost(url);
        this.toggleSitePattern(host);
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
        this.reportChanges();
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
        this.reportChanges();
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
        let css: string;
        const {DARK_SITES} = this.config;
        const isUrlInDarkList = isUrlInList(url, DARK_SITES);
        const isUrlInUserList = isUrlInList(url, this.filterConfig.siteList);

        if (
            (isUrlInUserList && this.filterConfig.invertListed)
            || (!isUrlInDarkList
                && !this.filterConfig.invertListed
                && !isUrlInUserList)
        ) {
            console.log(`Creating CSS for url: ${url}`);
            css = createCSSFilterStylesheet(this.filterConfig, this.config.getFixesFor(url));
        } else {
            console.log(`Site is not inverted: ${url}`);
            css = '';
        }
        return this.addStyleScript
            .replace(/(^\s*)(\/\/\s*?#DEBUG\s*)(.*?$)/igm, this.config.DEBUG ? '$1$3' : '')
            .replace(/\$CSS/g, `'${css.replace(/\'/g, '\\\'')}'`);
    }

    protected getCode_removeStyle() {
        return this.removeStyleScript
            .replace(/(^\s*)(\/\/\s*?#DEBUG\s*)(.*?$)/igm, this.config.DEBUG ? '$1$3' : '');
    }

    protected saveUserSettings() {
        this.user.saveSetting({
            enabled: this.enabled,
            config: this.filterConfig,
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
        const {RAW_INVERSION_FIXES} = this.config;
        const fixes = this.getSavedDevInversionFixes();
        return formatJson(fixes ? JSON.parse(fixes) : RAW_INVERSION_FIXES);
    }

    resetDevInversionFixes() {
        const {RAW_INVERSION_FIXES} = this.config;
        localStorage.removeItem('dev_inversion_fixes');
        this.config.handleInversionFixes(RAW_INVERSION_FIXES);
        this.onConfigPropChanged();
    }

    applyDevInversionFixes(json: string) {
        let obj;
        try {
            obj = JSON.parse(json);
            const text = formatJson(obj);
            this.saveDevInversionFixes(text);
            this.config.handleInversionFixes(obj);
            this.onConfigPropChanged();
            return null;
        } catch (err) {
            return err;
        }
    }
}
