import ConfigManager from './config-manager';
import DevTools from './devtools';
import IconManager from './icon-manager';
import Messenger from './messenger';
import TabManager from './tab-manager';
import UserStorage from './user-storage';
import {getFontList, getCommands} from './utils/extension-api';
import {isFirefox} from '../utils/platform';
import {isUrlInList, getUrlHost} from '../utils/url';
import ThemeEngines from '../generators/theme-engines';
import createCSSFilterStylesheet from '../generators/css-filter';
import createStaticStylesheet from '../generators/static-theme';
import {createSVGFilterStylesheet, getSVGFilterMatrixValue, getSVGReverseFilterMatrixValue} from '../generators/svg-filter';
import {FilterConfig, ExtensionData, Shortcuts} from '../definitions';

export class Extension {

    enabled: boolean;
    ready: boolean;

    config: ConfigManager;
    devtools: DevTools;
    filterConfig: FilterConfig;
    fonts: string[];
    icon: IconManager;
    messenger: Messenger;
    tabs: TabManager;
    user: UserStorage;

    constructor() {
        this.ready = false;

        this.icon = new IconManager();
        this.config = new ConfigManager();
        this.devtools = new DevTools(this.config, () => this.onConfigPropChanged());
        this.messenger = new Messenger(this.getMessengerAdapter());
        this.tabs = new TabManager({
            getConnectionMessage: (url) => this.enabled && this.getTabMessage(url),
        });
        this.user = new UserStorage();
        this.awaiting = [];
    }

    private awaiting: (() => void)[];

    async start() {
        await this.config.load();
        this.fonts = await getFontList();

        const settings = await this.user.loadSettings();
        if (settings.enabled) {
            this.enable();
        } else {
            this.disable();
        }
        console.log('loaded', settings);

        this.registerCommands();

        this.ready = true;
        this.setConfig(settings.config);

        this.awaiting.forEach((ready) => ready());
        this.awaiting = null;
    }

    private getMessengerAdapter() {
        return {
            collect: async () => {
                if (!this.ready) {
                    await new Promise((resolve) => this.awaiting.push(resolve));
                }
                return await this.collectData();
            },
            getActiveTabInfo: async () => {
                if (!this.ready) {
                    await new Promise((resolve) => this.awaiting.push(resolve));
                }
                return await this.tabs.getActiveTabInfo(this.config);
            },
            enable: () => this.enable(),
            disable: () => this.disable(),
            setConfig: (config) => this.setConfig(config),
            toggleSitePattern: (pattern) => this.toggleSitePattern(pattern),
            applyDevInversionFixes: (json) => this.devtools.applyInversionFixes(json),
            resetDevInversionFixes: () => this.devtools.resetInversionFixes(),
            applyDevStaticThemes: (text) => this.devtools.applyStaticThemes(text),
            resetDevStaticThemes: () => this.devtools.resetStaticThemes(),
        };
    }

    private registerCommands() {
        if (!chrome.commands) {
            // Fix for Firefox Android
            return;
        }
        chrome.commands.onCommand.addListener((command) => {
            if (command === 'toggle') {
                console.log('Toggle command entered');
                if (this.enabled) {
                    this.disable();
                } else {
                    this.enable();
                }
            }
            if (command === 'addSite') {
                console.log('Add Site command entered');
                this.toggleCurrentSite();
            }
            if (command === 'switchEngine') {
                console.log('Switch Engine command entered');
                const engines = Object.values(ThemeEngines);
                const index = engines.indexOf(this.filterConfig.engine);
                const next = index === engines.length - 1 ? engines[0] : engines[index + 1];
                this.setConfig({engine: next});
            }
        });
    }

    private async getShortcuts() {
        const commands = await getCommands();
        return commands.reduce((map, cmd) => Object.assign(map, {[cmd.name]: cmd.shortcut}), {} as Shortcuts);
    }

    private async collectData(): Promise<ExtensionData> {
        return {
            enabled: this.enabled,
            filterConfig: this.filterConfig,
            ready: this.ready,
            fonts: this.fonts,
            shortcuts: await this.getShortcuts(),
            devInversionFixesText: this.devtools.getInversionFixesText(),
            devStaticThemesText: this.devtools.getStaticThemesText(),
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

    private async reportChanges() {
        const info = await this.collectData();
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
        const {url} = await this.tabs.getActiveTabInfo(this.config);
        const host = getUrlHost(url);
        this.toggleSitePattern(host);
    }


    //------------------------------------
    //
    //       Handle config changes
    //

    protected onAppToggle() {
        if (this.enabled) {
            this.icon.setActive();
        } else {
            this.icon.setInactive();
        }
        this.tabs.sendMessage(this.getTabMessage);
        this.saveUserSettings();
        this.reportChanges();
    }

    protected onConfigPropChanged() {
        if (this.enabled) {
            this.tabs.sendMessage(this.getTabMessage);
        }
        this.saveUserSettings();
        this.reportChanges();
    }


    //----------------------
    //
    // Add/remove css to tab
    //
    //----------------------

    private getTabMessage = (url: string) => {
        const {DARK_SITES} = this.config;
        const isUrlInDarkList = isUrlInList(url, DARK_SITES);
        const isUrlInUserList = isUrlInList(url, this.filterConfig.siteList);

        if (this.enabled && (
            (isUrlInUserList && this.filterConfig.invertListed) ||
            (!isUrlInDarkList && !this.filterConfig.invertListed && !isUrlInUserList)
        )) {
            console.log(`Creating CSS for url: ${url}`);
            switch (this.filterConfig.engine) {
                case ThemeEngines.cssFilter: {
                    return {
                        type: 'add-css-filter',
                        data: createCSSFilterStylesheet(this.filterConfig, url, this.config.INVERSION_FIXES),
                    };
                }
                case ThemeEngines.svgFilter: {
                    if (isFirefox()) {
                        return {
                            type: 'add-css-filter',
                            data: createSVGFilterStylesheet(this.filterConfig, url, this.config.INVERSION_FIXES),
                        };
                    }
                    return {
                        type: 'add-svg-filter',
                        data: {
                            css: createSVGFilterStylesheet(this.filterConfig, url, this.config.INVERSION_FIXES),
                            svgMatrix: getSVGFilterMatrixValue(this.filterConfig),
                            svgReverseMatrix: getSVGReverseFilterMatrixValue(),
                        },
                    };
                }
                case ThemeEngines.staticTheme: {
                    return {
                        type: 'add-static-theme',
                        data: createStaticStylesheet(this.filterConfig, url, this.config.STATIC_THEMES),
                    };
                }
                default: {
                    throw new Error(`Unknown engine ${this.filterConfig.engine}`);
                }
            }
        } else {
            console.log(`Site is not inverted: ${url}`);
        }
        return {
            type: 'clean-up',
        };
    };


    //-------------------------------------
    //          User settings

    private async saveUserSettings() {
        const saved = await this.user.saveSetting({
            enabled: this.enabled,
            config: this.filterConfig,
        });
        console.log('saved', saved);
    }
}
