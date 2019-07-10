import ConfigManager from './config-manager';
import DevTools from './devtools';
import IconManager from './icon-manager';
import Messenger from './messenger';
import Newsmaker from './newsmaker';
import TabManager from './tab-manager';
import UserStorage from './user-storage';
import {setWindowTheme, resetWindowTheme} from './window-theme';
import {getFontList, getCommands, setShortcut, canInjectScript} from './utils/extension-api';
import {isFirefox} from '../utils/platform';
import {isInTimeInterval, getDuration} from '../utils/time';
import {isURLInList, getURLHost, isURLEnabled} from '../utils/url';
import ThemeEngines from '../generators/theme-engines';
import createCSSFilterStylesheet from '../generators/css-filter';
import {getDynamicThemeFixesFor} from '../generators/dynamic-theme';
import createStaticStylesheet from '../generators/static-theme';
import {createSVGFilterStylesheet, getSVGFilterMatrixValue, getSVGReverseFilterMatrixValue} from '../generators/svg-filter';
import {ExtensionData, FilterConfig, News, Shortcuts, UserSettings, TabInfo} from '../definitions';

const AUTO_TIME_CHECK_INTERVAL = getDuration({seconds: 10});

export class Extension {
    ready: boolean;

    config: ConfigManager;
    devtools: DevTools;
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
        this.devtools = new DevTools(this.config, () => this.onSettingsChanged());
        this.messenger = new Messenger(this.getMessengerAdapter());
        this.news = new Newsmaker((news) => this.onNewsUpdate(news));
        this.tabs = new TabManager({
            getConnectionMessage: (url, frameURL) => this.getConnectionMessage(url, frameURL),
        });
        this.user = new UserStorage();
        this.awaiting = [];
    }

    isEnabled() {
        if (this.user.settings.automation === 'time') {
            const now = new Date();
            return isInTimeInterval(now, this.user.settings.time.activation, this.user.settings.time.deactivation);
        }
        return this.user.settings.enabled;
    }

    private awaiting: (() => void)[];

    async start() {
        await this.config.load({local: true});
        this.fonts = await getFontList();

        await this.user.loadSettings();
        this.onAppToggle();
        this.changeSettings(this.user.settings);
        console.log('loaded', this.user.settings);

        this.registerCommands();

        this.ready = true;
        this.tabs.updateContentScript();

        this.awaiting.forEach((ready) => ready());
        this.awaiting = null;

        this.startAutoTimeCheck();
        this.news.subscribe();
        this.user.cleanup();
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
                const url = await this.tabs.getActiveTabURL();
                return await this.getURLInfo(url);
            },
            changeSettings: (settings) => this.changeSettings(settings),
            setTheme: (theme) => this.setTheme(theme),
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
                this.changeSettings({
                    enabled: !this.isEnabled(),
                    automation: '',
                });
            }
            if (command === 'addSite') {
                console.log('Add Site command entered');
                this.toggleCurrentSite();
            }
            if (command === 'switchEngine') {
                console.log('Switch Engine command entered');
                const engines = Object.values(ThemeEngines);
                const index = engines.indexOf(this.user.settings.theme.engine);
                const next = index === engines.length - 1 ? engines[0] : engines[index + 1];
                this.setTheme({engine: next});
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
            isEnabled: this.isEnabled(),
            isReady: this.ready,
            settings: this.user.settings,
            fonts: this.fonts,
            news: this.news.latest,
            shortcuts: await this.getShortcuts(),
            devDynamicThemeFixesText: this.devtools.getDynamicThemeFixesText(),
            devInversionFixesText: this.devtools.getInversionFixesText(),
            devStaticThemesText: this.devtools.getStaticThemesText(),
        };
    }

    private onNewsUpdate(news: News[]) {
        const unread = news.filter(({read}) => !read);
        if (unread.length > 0 && this.user.settings.notifyOfNews) {
            this.icon.notifyAboutReleaseNotes(unread.length);
        } else {
            this.icon.stopNotifyingAboutReleaseNotes();
        }
    }

    private getConnectionMessage(url, frameURL) {
        if (this.ready) {
            return this.isEnabled() && this.getTabMessage(url, frameURL);
        } else {
            return new Promise((resolve) => {
                this.awaiting.push(() => {
                    resolve(this.isEnabled() && this.getTabMessage(url, frameURL));
                });
            });
        }
    }

    private wasEnabledOnLastCheck: boolean;

    private startAutoTimeCheck() {
        setInterval(() => {
            if (!this.ready || this.user.settings.automation !== 'time') {
                return;
            }
            const isEnabled = this.isEnabled();
            if (this.wasEnabledOnLastCheck !== isEnabled) {
                this.wasEnabledOnLastCheck = isEnabled;
                this.onAppToggle();
                this.tabs.sendMessage(this.getTabMessage);
                this.reportChanges();
            }
        }, AUTO_TIME_CHECK_INTERVAL);
    }

    changeSettings($settings: Partial<UserSettings>) {
        const prev = {...this.user.settings};

        this.user.set($settings);

        if (
            (prev.enabled !== this.user.settings.enabled) ||
            (prev.automation !== this.user.settings.automation) ||
            (prev.time.activation !== this.user.settings.time.activation) ||
            (prev.time.deactivation !== this.user.settings.time.deactivation)
        ) {
            this.onAppToggle();
        }

        if (this.isEnabled() && $settings.changeBrowserTheme != null && prev.changeBrowserTheme !== $settings.changeBrowserTheme) {
            if ($settings.changeBrowserTheme) {
                setWindowTheme(this.user.settings.theme);
            } else {
                resetWindowTheme();
            }
        }

        this.onSettingsChanged();
    }

    setTheme($theme: Partial<FilterConfig>) {
        this.user.set({theme: {...this.user.settings.theme, ...$theme}});

        if (this.isEnabled() && this.user.settings.changeBrowserTheme) {
            setWindowTheme(this.user.settings.theme);
        }

        this.onSettingsChanged();
    }

    private async reportChanges() {
        const info = await this.collectData();
        this.messenger.reportChanges(info);
    }

    toggleSitePattern(pattern: string) {
        const siteList = this.user.settings.siteList.slice();
        const index = siteList.indexOf(pattern);
        if (index < 0) {
            siteList.push(pattern);
        } else {
            siteList.splice(index, 1);
        }
        this.changeSettings({siteList});
    }

    /**
     * Adds host name of last focused tab
     * into Sites List (or removes).
     */
    async toggleCurrentSite() {
        const url = await this.tabs.getActiveTabURL();
        const host = getURLHost(url);
        this.toggleSitePattern(host);
    }


    //------------------------------------
    //
    //       Handle config changes
    //

    private onAppToggle() {
        if (this.isEnabled()) {
            this.icon.setActive();
            if (this.user.settings.changeBrowserTheme) {
                setWindowTheme(this.user.settings.theme);
            }
        } else {
            this.icon.setInactive();
            if (this.user.settings.changeBrowserTheme) {
                resetWindowTheme();
            }
        }
    }

    private onSettingsChanged() {
        if (!this.ready) {
            return;
        }

        this.wasEnabledOnLastCheck = this.isEnabled();
        this.tabs.sendMessage(this.getTabMessage);
        this.saveUserSettings();
        this.reportChanges();
    }


    //----------------------
    //
    // Add/remove css to tab
    //
    //----------------------

    private getURLInfo(url: string): TabInfo {
        const {DARK_SITES} = this.config;
        const isInDarkList = isURLInList(url, DARK_SITES);
        const isProtected = !canInjectScript(url);
        return {
            url,
            isInDarkList,
            isProtected,
        };
    }

    private getTabMessage = (url: string, frameURL: string) => {
        const urlInfo = this.getURLInfo(url);
        if (this.isEnabled() && isURLEnabled(url, this.user.settings, urlInfo)) {
            const custom = this.user.settings.customThemes.find(({url: urlList}) => isURLInList(url, urlList));
            const filterConfig = custom ? custom.theme : this.user.settings.theme;

            console.log(`Creating CSS for url: ${url}`);
            switch (filterConfig.engine) {
                case ThemeEngines.cssFilter: {
                    return {
                        type: 'add-css-filter',
                        data: createCSSFilterStylesheet(filterConfig, url, frameURL, this.config.INVERSION_FIXES),
                    };
                }
                case ThemeEngines.svgFilter: {
                    if (isFirefox()) {
                        return {
                            type: 'add-css-filter',
                            data: createSVGFilterStylesheet(filterConfig, url, frameURL, this.config.INVERSION_FIXES),
                        };
                    }
                    return {
                        type: 'add-svg-filter',
                        data: {
                            css: createSVGFilterStylesheet(filterConfig, url, frameURL, this.config.INVERSION_FIXES),
                            svgMatrix: getSVGFilterMatrixValue(filterConfig),
                            svgReverseMatrix: getSVGReverseFilterMatrixValue(),
                        },
                    };
                }
                case ThemeEngines.staticTheme: {
                    return {
                        type: 'add-static-theme',
                        data: filterConfig.stylesheet && filterConfig.stylesheet.trim() ?
                            filterConfig.stylesheet :
                            createStaticStylesheet(filterConfig, url, frameURL, this.config.STATIC_THEMES),
                    };
                }
                case ThemeEngines.dynamicTheme: {
                    const filter = {...filterConfig};
                    delete filter.engine;
                    const fixes = getDynamicThemeFixesFor(url, frameURL, this.config.DYNAMIC_THEME_FIXES);
                    const isIFrame = frameURL != null;
                    return {
                        type: 'add-dynamic-theme',
                        data: {filter, fixes, isIFrame},
                    };
                }
                default: {
                    throw new Error(`Unknown engine ${filterConfig.engine}`);
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
        await this.user.saveSettings();
        console.log('saved', this.user.settings);
    }
}
