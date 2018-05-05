import ConfigManager from './config-manager';
import DevTools from './devtools';
import IconManager from './icon-manager';
import Messenger from './messenger';
import Newsmaker from './newsmaker';
import TabManager from './tab-manager';
import UserStorage from './user-storage';
import {setWindowTheme, resetWindowTheme} from './window-theme';
import {getFontList, getCommands, setShortcut} from './utils/extension-api';
import {isFirefox, isMobile} from '../utils/platform';
import {isURLInList, getURLHost} from '../utils/url';
import ThemeEngines from '../generators/theme-engines';
import createCSSFilterStylesheet from '../generators/css-filter';
import {getDynamicThemeFixesFor} from '../generators/dynamic-theme';
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
    news: Newsmaker;
    tabs: TabManager;
    user: UserStorage;

    constructor() {
        this.ready = false;

        this.icon = new IconManager();
        this.config = new ConfigManager();
        this.devtools = new DevTools(this.config, () => this.onConfigPropChanged());
        this.messenger = new Messenger(this.getMessengerAdapter());
        this.news = new Newsmaker((news) => {
            const unread = news.filter(({read}) => !read);
            if (unread.length > 0) {
                this.icon.notifyAboutReleaseNotes(unread.length);
            } else {
                this.icon.stopNotifyingAboutReleaseNotes();
            }
        });
        this.tabs = new TabManager({
            getConnectionMessage: (url, frameURL) => {
                if (this.ready) {
                    return this.enabled && this.getTabMessage(url, frameURL);
                } else {
                    return new Promise((resolve) => {
                        this.awaiting.push(() => {
                            resolve(this.enabled && this.getTabMessage(url, frameURL));
                        });
                    });
                }
            }
        });
        this.user = new UserStorage();
        this.awaiting = [];
    }

    private awaiting: (() => void)[];

    async start() {
        await this.config.load({local: true});
        this.fonts = await getFontList();

        const settings = await this.user.loadSettings();
        if (settings.enabled) {
            this.enable();
        } else {
            this.disable();
        }
        this.setConfig(settings.config);
        console.log('loaded', settings);

        this.registerCommands();

        this.ready = true;
        this.tabs.updateContentScript();

        this.awaiting.forEach((ready) => ready());
        this.awaiting = null;

        this.config.load({local: false});
    }

    private popupOpeningListener: () => void = null;

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
            setShortcut: ({command, shortcut}) => this.setShortcut(command, shortcut),
            toggleSitePattern: (pattern) => this.toggleSitePattern(pattern),
            markNewsAsRead: (ids) => this.news.markAsRead(...ids),
            onPopupOpen: () => this.popupOpeningListener && this.popupOpeningListener(),
            applyDevDynamicThemeFixes: (text) => this.devtools.applyDynamicThemeFixes(text),
            resetDevDynamicThemeFixes: () => this.devtools.resetDynamicThemeFixes(),
            applyDevInversionFixes: (text) => this.devtools.applyInversionFixes(text),
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

    setShortcut(command: string, shortcut: string) {
        setShortcut(command, shortcut);
    }

    private async collectData(): Promise<ExtensionData> {
        return {
            enabled: this.enabled,
            filterConfig: this.filterConfig,
            ready: this.ready,
            fonts: this.fonts,
            news: this.news.latest,
            shortcuts: await this.getShortcuts(),
            devDynamicThemeFixesText: this.devtools.getDynamicThemeFixesText(),
            devInversionFixesText: this.devtools.getInversionFixesText(),
            devStaticThemesText: this.devtools.getStaticThemesText(),
        };
    }

    enable() {
        this.enabled = true;
        this.filterConfig && setWindowTheme(this.filterConfig);
        this.onAppToggle();
    }

    disable() {
        this.enabled = false;
        resetWindowTheme();
        this.onAppToggle();
    }

    setConfig(config: FilterConfig) {
        this.filterConfig = {...this.filterConfig, ...config};
        this.enabled && setWindowTheme(this.filterConfig);
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
        const host = getURLHost(url);
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
        if (!this.ready) {
            return;
        }
        this.tabs.sendMessage(this.getTabMessage);
        this.saveUserSettings();
        this.reportChanges();
    }

    protected onConfigPropChanged() {
        if (!this.ready) {
            return;
        }
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

    private getTabMessage = (url: string, frameURL: string) => {
        const {DARK_SITES} = this.config;
        const isUrlInDarkList = isURLInList(url, DARK_SITES);
        const isUrlInUserList = isURLInList(url, this.filterConfig.siteList);

        if (this.enabled && (
            (isUrlInUserList && this.filterConfig.invertListed) ||
            (!isUrlInDarkList && !this.filterConfig.invertListed && !isUrlInUserList)
        )) {
            console.log(`Creating CSS for url: ${url}`);
            switch (this.filterConfig.engine) {
                case ThemeEngines.cssFilter: {
                    return {
                        type: 'add-css-filter',
                        data: createCSSFilterStylesheet(this.filterConfig, url, frameURL, this.config.INVERSION_FIXES),
                    };
                }
                case ThemeEngines.svgFilter: {
                    if (isFirefox()) {
                        return {
                            type: 'add-css-filter',
                            data: createSVGFilterStylesheet(this.filterConfig, url, frameURL, this.config.INVERSION_FIXES),
                        };
                    }
                    return {
                        type: 'add-svg-filter',
                        data: {
                            css: createSVGFilterStylesheet(this.filterConfig, url, frameURL, this.config.INVERSION_FIXES),
                            svgMatrix: getSVGFilterMatrixValue(this.filterConfig),
                            svgReverseMatrix: getSVGReverseFilterMatrixValue(),
                        },
                    };
                }
                case ThemeEngines.staticTheme: {
                    return {
                        type: 'add-static-theme',
                        data: createStaticStylesheet(this.filterConfig, url, frameURL, this.config.STATIC_THEMES),
                    };
                }
                case ThemeEngines.dynamicTheme: {
                    const {siteList, invertListed, engine, ...filter} = this.filterConfig;
                    const fixes = getDynamicThemeFixesFor(url, frameURL, this.config.DYNAMIC_THEME_FIXES);
                    return {
                        type: 'add-dynamic-theme',
                        data: {filter, fixes},
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
