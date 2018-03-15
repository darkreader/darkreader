import ConfigManager from './config-manager';
import IconManager from './icon-manager';
import Messenger from './messenger';
import TabManager from './tab-manager';
import UserStorage from './user-storage';
import {simpleClone, getFontList, getCommands, canInjectScript, isUrlInList, getUrlHost} from './utils';
import {formatJson} from '../config/utils';
import createCSSFilterStylesheet from '../generators/css-filter';
import {FilterConfig, ExtensionData, Shortcuts} from '../definitions';

export class Extension {

    enabled: boolean;
    ready: boolean;
    config: ConfigManager;
    filterConfig: FilterConfig;
    fonts: string[];
    icon: IconManager;
    messenger: Messenger;
    shortcuts: Shortcuts;
    tabs: TabManager;
    user: UserStorage;

    constructor() {
        this.ready = false;

        this.icon = new IconManager();
        this.config = new ConfigManager();
        this.messenger = new Messenger({
            collect: () => this.collectData(),
            getActiveTabInfo: async () => await this.tabs.getActiveTabInfo(),
            enable: () => this.enable(),
            disable: () => this.disable(),
            setConfig: (config) => this.setConfig(config),
            toggleSitePattern: (pattern) => this.toggleSitePattern(pattern),
            applyDevInversionFixes: (json) => this.applyDevInversionFixes(json),
            resetDevInversionFixes: () => this.resetDevInversionFixes(),
        });
        this.tabs = new TabManager(this.config);
    }

    private async registerCommands() {
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
        const commands = await getCommands();
        this.shortcuts = commands.reduce((map, cmd) => Object.assign(map, {[cmd.name]: cmd.shortcut}), {} as Shortcuts);
    }

    async start() {
        const loadInjections = async () => {
            const loadAddStyleScript = async () => {
                const res = await fetch('../inject/add-style.js');
                return await res.text();
            };
            const loadRemoveStyleScript = async () => {
                const res = await fetch('../inject/remove-style.js');
                return await res.text();
            };
            const [addStyle, removeStyle] = await Promise.all([
                loadAddStyleScript(),
                loadRemoveStyleScript(),
            ]);
            this.scripts = {addStyle, removeStyle};
        };

        const loadFonts = async () => {
            const fonts = await getFontList();
            this.fonts = fonts;
        };

        await Promise.all([
            loadInjections(),
            this.config.load(),
            loadFonts(),
            this.registerCommands(),
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
            shortcuts: this.shortcuts,
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
        const {url} = await this.tabs.getActiveTabInfo();
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
            this.tabs.injectScriptToAll(this.addStyleCodeGenerator);
            this.tabs.injectOnUpdate(this.addStyleCodeGenerator);

        } else {

            //
            // Switch OFF

            this.icon.setInactive();
            this.tabs.stopInjecting(this.addStyleCodeGenerator);
            this.tabs.injectScriptToAll(this.removeStyleCodeGenerator);
        }
        this.saveUserSettings();
        this.reportChanges();
    }

    protected onConfigPropChanged() {
        if (this.enabled) {
            this.tabs.injectScriptToAll(this.addStyleCodeGenerator);
        }
        this.saveUserSettings();
        this.reportChanges();
    }


    //----------------------
    //
    // Add/remove css to tab
    //
    //----------------------

    private scripts: {addStyle, removeStyle};

    private addStyleCodeGenerator = (url: string) => {
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
        return this.scripts.addStyle
            .replace(/\$CSS/g, `'${css.replace(/\'/g, '\\\'')}'`);
    };

    private removeStyleCodeGenerator = () => {
        return this.scripts.removeStyle;
    };


    //-------------------------------------
    //          User settings

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
