import ConfigManager from './config-manager';
import DevTools from './devtools';
import IconManager from './icon-manager';
import type {ExtensionAdapter} from './messenger';
import Messenger from './messenger';
import Newsmaker from './newsmaker';
import TabManager from './tab-manager';
import UserStorage from './user-storage';
import {setWindowTheme, resetWindowTheme} from './window-theme';
import {getFontList, getCommands, setShortcut, canInjectScript} from './utils/extension-api';
import {isInTimeInterval, getDuration, isNightAtLocation} from '../utils/time';
import {isURLInList, getURLHostOrProtocol, isURLEnabled, isPDF} from '../utils/url';
import ThemeEngines from '../generators/theme-engines';
import createCSSFilterStylesheet from '../generators/css-filter';
import {getDynamicThemeFixesFor} from '../generators/dynamic-theme';
import createStaticStylesheet from '../generators/static-theme';
import {createSVGFilterStylesheet, getSVGFilterMatrixValue, getSVGReverseFilterMatrixValue} from '../generators/svg-filter';
import type {ExtensionData, FilterConfig, News, Shortcuts, UserSettings, TabInfo} from '../definitions';
import {isSystemDarkModeEnabled} from '../utils/media-query';
import {isFirefox, isThunderbird} from '../utils/platform';

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
            getConnectionMessage: ({url, frameURL, unsupportedSender}) => {
                if (unsupportedSender) {
                    return this.getUnsupportedSenderMessage();
                }
                return this.getConnectionMessage(url, frameURL);
            },
            onColorSchemeChange: this.onColorSchemeChange,
        });
        this.user = new UserStorage({onRemoteSettingsChange: () => this.onRemoteSettingsChange()});
        this.awaiting = [];
    }

    isEnabled() {
        const {automation} = this.user.settings;
        if (automation === 'time') {
            const now = new Date();
            return isInTimeInterval(now, this.user.settings.time.activation, this.user.settings.time.deactivation);
        } else if (automation === 'system') {
            if (isFirefox) {
                // BUG: Firefox background page always matches initial color scheme.
                return this.wasLastColorSchemeDark == null
                    ? isSystemDarkModeEnabled()
                    : this.wasLastColorSchemeDark;
            }
            return isSystemDarkModeEnabled();
        } else if (automation === 'location') {
            const latitude = this.user.settings.location.latitude;
            const longitude = this.user.settings.location.longitude;

            if (latitude != null && longitude != null) {
                const now = new Date();
                return isNightAtLocation(now, latitude, longitude);
            }
        }

        return this.user.settings.enabled;
    }

    private awaiting: Array<() => void>;

    async start() {
        await this.config.load({local: true});
        this.fonts = await getFontList();

        await this.user.loadSettings();
        if (this.user.settings.syncSitesFixes) {
            await this.config.load({local: false});
        }
        this.onAppToggle();
        this.changeSettings(this.user.settings);
        console.log('loaded', this.user.settings);

        this.registerCommands();

        this.ready = true;
        if (isThunderbird) {
            this.tabs.registerMailDisplayScript();
        } else {
            this.tabs.updateContentScript({runOnProtectedPages: this.user.settings.enableForProtectedPages});
        }

        this.awaiting.forEach((ready) => ready());
        this.awaiting = null;

        this.startAutoTimeCheck();
        this.news.subscribe();
    }

    private popupOpeningListener: () => void = null;

    private getMessengerAdapter(): ExtensionAdapter {
        return {
            collect: async () => {
                if (!this.ready) {
                    await new Promise<void>((resolve) => this.awaiting.push(resolve));
                }
                return await this.collectData();
            },
            getActiveTabInfo: async () => {
                if (!this.ready) {
                    await new Promise<void>((resolve) => this.awaiting.push(resolve));
                }
                const url = await this.tabs.getActiveTabURL();
                return this.getURLInfo(url);
            },
            changeSettings: (settings) => this.changeSettings(settings),
            setTheme: (theme) => this.setTheme(theme),
            setShortcut: ({command, shortcut}) => this.setShortcut(command, shortcut),
            toggleURL: (url) => this.toggleURL(url),
            markNewsAsRead: async (ids) => await this.news.markAsRead(...ids),
            onPopupOpen: () => this.popupOpeningListener && this.popupOpeningListener(),
            loadConfig: async (options) => await this.config.load(options),
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
        chrome.commands.onCommand.addListener(async (command) => {
            if (command === 'toggle') {
                console.log('Toggle command entered');
                this.changeSettings({
                    enabled: !this.isEnabled(),
                    automation: '',
                });
            }
            if (command === 'addSite') {
                console.log('Add Site command entered');
                const url = await this.tabs.getActiveTabURL();
                if (isPDF(url)) {
                    this.changeSettings({enableForPDF: !this.user.settings.enableForPDF});
                } else {
                    this.toggleURL(url);
                }
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
            devtools: {
                dynamicFixesText: this.devtools.getDynamicThemeFixesText(),
                filterFixesText: this.devtools.getInversionFixesText(),
                staticThemesText: this.devtools.getStaticThemesText(),
                hasCustomDynamicFixes: this.devtools.hasCustomDynamicThemeFixes(),
                hasCustomFilterFixes: this.devtools.hasCustomFilterFixes(),
                hasCustomStaticFixes: this.devtools.hasCustomStaticFixes(),
            },
        };
    }

    private onNewsUpdate(news: News[]) {
        const latestNews = news.length > 0 && news[0];
        if (latestNews && latestNews.important && !latestNews.read) {
            this.icon.showImportantBadge();
            return;
        }

        const unread = news.filter(({read}) => !read);
        if (unread.length > 0 && this.user.settings.notifyOfNews) {
            this.icon.showUnreadReleaseNotesBadge(unread.length);
            return;
        }

        this.icon.hideBadge();
    }

    private getConnectionMessage(url, frameURL) {
        if (this.ready) {
            return this.getTabMessage(url, frameURL);
        }
        return new Promise<{type: string; data?: any}>((resolve) => {
            this.awaiting.push(() => {
                resolve(this.getTabMessage(url, frameURL));
            });
        });
    }

    private getUnsupportedSenderMessage() {
        return {type: 'unsupported-sender'};
    }

    private wasEnabledOnLastCheck: boolean;

    private startAutoTimeCheck() {
        setInterval(() => {
            if (!this.ready || this.user.settings.automation === '') {
                return;
            }
            this.handleAutoCheck();
        }, AUTO_TIME_CHECK_INTERVAL);
    }

    private wasLastColorSchemeDark = null;

    private onColorSchemeChange = ({isDark}) => {
        this.wasLastColorSchemeDark = isDark;
        if (this.user.settings.automation !== 'system') {
            return;
        }
        this.handleAutoCheck();
    };

    private handleAutoCheck = () => {
        if (!this.ready) {
            return;
        }
        const isEnabled = this.isEnabled();
        if (this.wasEnabledOnLastCheck !== isEnabled) {
            this.wasEnabledOnLastCheck = isEnabled;
            this.onAppToggle();
            this.tabs.sendMessage(this.getTabMessage);
            this.reportChanges();
        }
    };

    changeSettings($settings: Partial<UserSettings>) {
        const prev = {...this.user.settings};

        this.user.set($settings);

        if (
            (prev.enabled !== this.user.settings.enabled) ||
            (prev.automation !== this.user.settings.automation) ||
            (prev.time.activation !== this.user.settings.time.activation) ||
            (prev.time.deactivation !== this.user.settings.time.deactivation) ||
            (prev.location.latitude !== this.user.settings.location.latitude) ||
            (prev.location.longitude !== this.user.settings.location.longitude)
        ) {
            this.onAppToggle();
        }
        if (prev.syncSettings !== this.user.settings.syncSettings) {
            this.user.saveSyncSetting(this.user.settings.syncSettings);
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

    toggleURL(url: string) {
        const isInDarkList = isURLInList(url, this.config.DARK_SITES);
        const siteList = isInDarkList ?
            this.user.settings.siteListEnabled.slice() :
            this.user.settings.siteList.slice();
        const pattern = getURLHostOrProtocol(url);
        const index = siteList.indexOf(pattern);
        if (index < 0) {
            siteList.push(pattern);
        } else {
            siteList.splice(index, 1);
        }
        if (isInDarkList) {
            this.changeSettings({siteListEnabled: siteList});
        } else {
            this.changeSettings({siteList});
        }
    }

    /**
     * Adds host name of last focused tab
     * into Sites List (or removes).
     */
    async toggleCurrentSite() {
        const url = await this.tabs.getActiveTabURL();
        this.toggleURL(url);
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

    private onRemoteSettingsChange() {
        // TODO: Requires proper handling and more testing
        // to prevent cycling across instances.
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
            const preset = custom ? null : this.user.settings.presets.find(({urls}) => isURLInList(url, urls));
            const theme = custom ? custom.theme : preset ? preset.theme : this.user.settings.theme;

            console.log(`Creating CSS for url: ${url}`);
            switch (theme.engine) {
                case ThemeEngines.cssFilter: {
                    return {
                        type: 'add-css-filter',
                        data: createCSSFilterStylesheet(theme, url, frameURL, this.config.INVERSION_FIXES),
                    };
                }
                case ThemeEngines.svgFilter: {
                    if (isFirefox) {
                        return {
                            type: 'add-css-filter',
                            data: createSVGFilterStylesheet(theme, url, frameURL, this.config.INVERSION_FIXES),
                        };
                    }
                    return {
                        type: 'add-svg-filter',
                        data: {
                            css: createSVGFilterStylesheet(theme, url, frameURL, this.config.INVERSION_FIXES),
                            svgMatrix: getSVGFilterMatrixValue(theme),
                            svgReverseMatrix: getSVGReverseFilterMatrixValue(),
                        },
                    };
                }
                case ThemeEngines.staticTheme: {
                    return {
                        type: 'add-static-theme',
                        data: theme.stylesheet && theme.stylesheet.trim() ?
                            theme.stylesheet :
                            createStaticStylesheet(theme, url, frameURL, this.config.STATIC_THEMES),
                    };
                }
                case ThemeEngines.dynamicTheme: {
                    const filter = {...theme};
                    delete filter.engine;
                    const fixes = getDynamicThemeFixesFor(url, frameURL, this.config.DYNAMIC_THEME_FIXES, this.user.settings.enableForPDF);
                    const isIFrame = frameURL != null;
                    return {
                        type: 'add-dynamic-theme',
                        data: {filter, fixes, isIFrame},
                    };
                }
                default: {
                    throw new Error(`Unknown engine ${theme.engine}`);
                }
            }
        }

        console.log(`Site is not inverted: ${url}`);
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
