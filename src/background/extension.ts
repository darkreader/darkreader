import ConfigManager from './config-manager';
import DevTools from './devtools';
import IconManager from './icon-manager';
import type {ExtensionAdapter} from './messenger';
import Messenger from './messenger';
import Newsmaker from './newsmaker';
import TabManager from './tab-manager';
import UserStorage from './user-storage';
import {setWindowTheme, resetWindowTheme} from './window-theme';
import {getCommands, setShortcut, canInjectScript} from './utils/extension-api';
import {isInTimeIntervalLocal, nextTimeInterval, isNightAtLocation, nextTimeChangeAtLocation} from '../utils/time';
import {isURLInList, getURLHostOrProtocol, isURLEnabled, isPDF} from '../utils/url';
import ThemeEngines from '../generators/theme-engines';
import createCSSFilterStylesheet from '../generators/css-filter';
import {getDynamicThemeFixesFor} from '../generators/dynamic-theme';
import createStaticStylesheet from '../generators/static-theme';
import {createSVGFilterStylesheet, getSVGFilterMatrixValue, getSVGReverseFilterMatrixValue} from '../generators/svg-filter';
import type {ExtensionData, FilterConfig, News, Shortcuts, UserSettings, TabInfo, TabData} from '../definitions';
import {isSystemDarkModeEnabled} from '../utils/media-query';
import {isFirefox, isMV3, isThunderbird} from '../utils/platform';
import {MessageType} from '../utils/message';
import {logInfo, logWarn} from '../utils/log';
import {PromiseBarrier} from '../utils/promise-barrier';
import {StateManager} from './utils/state-manager';

interface ExtensionState {
    isEnabled: boolean;
    wasEnabledOnLastCheck: boolean;
    registeredContextMenus: boolean;
}

declare const __DEBUG__: boolean;

export class Extension {
    config: ConfigManager;
    devtools: DevTools;
    icon: IconManager;
    messenger: Messenger;
    news: Newsmaker;
    tabs: TabManager;
    user: UserStorage;

    private isEnabled: boolean = null;
    private wasEnabledOnLastCheck: boolean = null;
    private registeredContextMenus: boolean = null;
    private popupOpeningListener: () => void = null;
    // Is used only with Firefox to bypass Firefox bug
    private wasLastColorSchemeDark: boolean = null;
    private startBarrier: PromiseBarrier<void, void> = null;
    private stateManager: StateManager<ExtensionState> = null;

    private static ALARM_NAME = 'auto-time-alarm';
    private static LOCAL_STORAGE_KEY = 'Extension-state';
    constructor() {
        this.config = new ConfigManager();
        this.devtools = new DevTools(this.config, async () => this.onSettingsChanged());
        this.messenger = new Messenger(this.getMessengerAdapter());
        this.news = new Newsmaker((news) => this.onNewsUpdate(news));
        this.tabs = new TabManager({
            getConnectionMessage: ({url, frameURL}) => this.getConnectionMessage(url, frameURL),
            getTabMessage: this.getTabMessage,
            onColorSchemeChange: this.onColorSchemeChange,
        });
        this.user = new UserStorage({onRemoteSettingsChange: () => this.onRemoteSettingsChange()});
        this.startBarrier = new PromiseBarrier();
        this.stateManager = new StateManager<ExtensionState>(Extension.LOCAL_STORAGE_KEY, this, {
            isEnabled: null,
            wasEnabledOnLastCheck: null,
            registeredContextMenus: null,
        });

        chrome.alarms.onAlarm.addListener(this.alarmListener);

        if (chrome.permissions.onRemoved) {
            chrome.permissions.onRemoved.addListener((permissions) => {
            // As far as we know, this code is never actually run because there
            // is no browser UI for removing 'contextMenus' permission.
            // This code exists for future-proofing in case browsers ever add such UI.
                if (!permissions.permissions.includes('contextMenus')) {
                    this.registeredContextMenus = false;
                }
            });
        }
    }

    private alarmListener = (alarm: chrome.alarms.Alarm): void => {
        if (alarm.name === Extension.ALARM_NAME) {
            this.handleAutoCheck();
        }
    };

    recalculateIsEnabled(): boolean {
        if (!this.user.settings) {
            logWarn('Extension.isEnabled() was called before Extension.user.settings is available.');
            return false;
        }

        const {automation} = this.user.settings;
        let nextCheck: number;
        switch (automation) {
            case 'time':
                this.isEnabled = isInTimeIntervalLocal(this.user.settings.time.activation, this.user.settings.time.deactivation);
                nextCheck = nextTimeInterval(this.user.settings.time.activation, this.user.settings.time.deactivation);
                break;
            case 'system':
                if (isMV3) {
                    logWarn('system automation is not yet supported. Defaulting to ON.');
                    this.isEnabled = true;
                    break;
                }
                if (isFirefox) {
                    // BUG: Firefox background page always matches initial color scheme.
                    this.isEnabled = this.wasLastColorSchemeDark == null
                        ? isSystemDarkModeEnabled()
                        : this.wasLastColorSchemeDark;
                } else {
                    this.isEnabled = isSystemDarkModeEnabled();
                }
                break;
            case 'location': {
                const {latitude, longitude} = this.user.settings.location;

                if (latitude != null && longitude != null) {
                    this.isEnabled = isNightAtLocation(latitude, longitude);
                    nextCheck = nextTimeChangeAtLocation(latitude, longitude);
                }
                break;
            }
            default:
                this.isEnabled = this.user.settings.enabled;
                break;
        }
        if (nextCheck) {
            chrome.alarms.create(Extension.ALARM_NAME, {when: nextCheck});
        }
        return this.isEnabled;
    }

    async start() {
        await this.config.load({local: true});

        await this.user.loadSettings();
        if (this.user.settings.enableContextMenus && !this.registeredContextMenus) {
            chrome.permissions.contains({permissions: ['contextMenus']}, (permitted) => {
                if (permitted) {
                    this.registerContextMenus();
                } else {
                    logWarn('User has enabled context menus, but did not provide permission.');
                }
            });
        }
        if (this.user.settings.syncSitesFixes) {
            await this.config.load({local: false});
        }
        this.onAppToggle();
        logInfo('loaded', this.user.settings);

        if (isThunderbird) {
            this.tabs.registerMailDisplayScript();
        } else {
            this.tabs.updateContentScript({runOnProtectedPages: this.user.settings.enableForProtectedPages});
        }

        this.user.settings.fetchNews && this.news.subscribe();
        this.startBarrier.resolve();

        if (__DEBUG__) {
            const socket = new WebSocket(`ws://localhost:8894`);
            socket.onmessage = (e) => {
                const respond = (message: {type: string; data?: ExtensionData | string | boolean | {[key: string]: string}; id?: number}) => socket.send(JSON.stringify(message));
                try {
                    const message: {type: string; data: Partial<UserSettings> | boolean | {[key: string]: string}; id: number} = JSON.parse(e.data);
                    switch (message.type) {
                        case 'changeSettings':
                            this.changeSettings(message.data as Partial<UserSettings>);
                            respond({type: 'changeSettings-response', id: message.id});
                            break;
                        case 'collectData':
                            this.collectData().then((data) => {
                                respond({type: 'collectData-response', id: message.id, data});
                            });
                            break;
                        case 'changeLocalStorage': {
                            const data = message.data as {[key: string]: string};
                            for (const key in data) {
                                localStorage[key] = data[key];
                            }
                            respond({type: 'changeLocalStorage-response', id: message.id});
                            break;
                        }
                        case 'getLocalStorage':
                            respond({type: 'getLocalStorage-response', id: message.id, data: localStorage ? JSON.stringify(localStorage) : null});
                            break;
                        case 'changeChromeStorage': {
                            const region: 'local' | 'sync' = (message.data as any).region;
                            chrome.storage[region].set((message.data as any).data, () => respond({type: 'changeChromeStorage-response', id: message.id}));
                            break;
                        }
                        case 'getChromeStorage': {
                            const keys = (message.data as any).keys;
                            const region: 'local' | 'sync' = (message.data as any).region;
                            chrome.storage[region].get(keys, (data) => respond({type: 'getChromeStorage-response', data, id: message.id}));
                            break;
                        }
                        case 'setDataIsMigratedForTesting':
                            this.devtools.setDataIsMigratedForTesting(message.data as boolean);
                            respond({type: 'setDataIsMigratedForTesting-response', id: message.id});
                            break;
                    }
                } catch (err) {
                    respond({type: 'error', data: String(err)});
                }
            };
        }
    }

    private getMessengerAdapter(): ExtensionAdapter {
        return {
            collect: async () => {
                return await this.collectData();
            },
            getActiveTabInfo: async () => {
                if (!this.user.settings) {
                    await this.user.loadSettings();
                }
                await this.stateManager.loadState();
                const url = await this.tabs.getActiveTabURL();
                const info = this.getURLInfo(url);
                info.isInjected = await this.tabs.canAccessActiveTab();
                return info;
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

    onCommand = async (command: string, frameURL?: string) => {
        if (this.startBarrier.isPending()) {
            await this.startBarrier.entry();
        }
        this.stateManager.loadState();
        switch (command) {
            case 'toggle':
                logInfo('Toggle command entered');
                this.changeSettings({
                    enabled: !this.isEnabled,
                    automation: '',
                });
                break;
            case 'addSite':
                logInfo('Add Site command entered');
                const url = frameURL || await this.tabs.getActiveTabURL();
                if (isPDF(url)) {
                    this.changeSettings({enableForPDF: !this.user.settings.enableForPDF});
                } else {
                    this.toggleURL(url);
                }
                break;
            case 'switchEngine': {
                logInfo('Switch Engine command entered');
                const engines = Object.values(ThemeEngines);
                const index = engines.indexOf(this.user.settings.theme.engine);
                const next = engines[(index + 1) % engines.length];
                this.setTheme({engine: next});
                break;
            }
        }
    };

    private registerContextMenus() {
        const onCommandToggle = async () => this.onCommand('toggle');
        const onCommandAddSite = async (data: chrome.contextMenus.OnClickData) => this.onCommand('addSite', data.frameUrl);
        const onCommandSwitchEngine = async () => this.onCommand('switchEngine');
        chrome.contextMenus.removeAll(() => {
            this.registeredContextMenus = false;
            chrome.contextMenus.create({
                id: 'DarkReader-top',
                title: 'Dark Reader'
            }, () => {
                if (chrome.runtime.lastError) {
                    // Failed to create the context menu
                    return;
                }
                const msgToggle = chrome.i18n.getMessage('toggle_extension');
                const msgAddSite = chrome.i18n.getMessage('toggle_current_site');
                const msgSwitchEngine = chrome.i18n.getMessage('theme_generation_mode');
                chrome.contextMenus.create({
                    id: 'DarkReader-toggle',
                    parentId: 'DarkReader-top',
                    title: msgToggle || 'Toggle everywhere',
                    onclick: onCommandToggle,
                });
                chrome.contextMenus.create({
                    id: 'DarkReader-addSite',
                    parentId: 'DarkReader-top',
                    title: msgAddSite || 'Toggle for current site',
                    onclick: onCommandAddSite,
                });
                chrome.contextMenus.create({
                    id: 'DarkReader-switchEngine',
                    parentId: 'DarkReader-top',
                    title: msgSwitchEngine || 'Switch engine',
                    onclick: onCommandSwitchEngine,
                });
                this.registeredContextMenus = true;
            });
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
        if (!this.user.settings) {
            await this.user.loadSettings();
        }
        await this.stateManager.loadState();
        return {
            isEnabled: this.isEnabled,
            isReady: true,
            settings: this.user.settings,
            news: await this.news.getLatest(),
            shortcuts: await this.getShortcuts(),
            colorScheme: this.config.COLOR_SCHEMES_RAW,
            devtools: {
                dynamicFixesText: await this.devtools.getDynamicThemeFixesText(),
                filterFixesText: await this.devtools.getInversionFixesText(),
                staticThemesText: await this.devtools.getStaticThemesText(),
                hasCustomDynamicFixes: await this.devtools.hasCustomDynamicThemeFixes(),
                hasCustomFilterFixes: await this.devtools.hasCustomFilterFixes(),
                hasCustomStaticFixes: await this.devtools.hasCustomStaticFixes(),
            },
        };
    }

    private onNewsUpdate(news: News[]) {
        if (!this.icon) {
            this.icon = new IconManager();
        }

        const latestNews = news.length > 0 && news[0];
        if (latestNews && latestNews.important && !latestNews.read) {
            this.icon.showImportantBadge();
            return;
        }

        this.icon.hideBadge();
    }

    private getConnectionMessage(url: string, frameURL: string) {
        if (this.user.settings) {
            return this.getTabMessage(url, frameURL);
        }
        return new Promise<TabData>((resolve) => {
            this.user.loadSettings().then(() => resolve(this.getTabMessage(url, frameURL)));
        });
    }

    private onColorSchemeChange = ({isDark}: {isDark: boolean}) => {
        if (isFirefox) {
            this.wasLastColorSchemeDark = isDark;
        }
        if (this.user.settings.automation !== 'system') {
            return;
        }
        this.handleAutoCheck();
    };

    private async handleAutoCheck() {
        if (!this.user.settings) {
            await this.user.loadSettings();
        }
        await this.stateManager.loadState();
        this.recalculateIsEnabled();
        const isEnabled = this.isEnabled;
        if (this.wasEnabledOnLastCheck === null || this.wasEnabledOnLastCheck !== isEnabled) {
            this.wasEnabledOnLastCheck = isEnabled;
            this.onAppToggle();
            this.tabs.sendMessage();
            this.reportChanges();
            this.stateManager.saveState();
        }
    }

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
        if (this.isEnabled && $settings.changeBrowserTheme != null && prev.changeBrowserTheme !== $settings.changeBrowserTheme) {
            if ($settings.changeBrowserTheme) {
                setWindowTheme(this.user.settings.theme);
            } else {
                resetWindowTheme();
            }
        }
        if (prev.fetchNews !== this.user.settings.fetchNews) {
            this.user.settings.fetchNews ? this.news.subscribe() : this.news.unSubscribe();
        }

        if (prev.enableContextMenus !== this.user.settings.enableContextMenus) {
            if (this.user.settings.enableContextMenus) {
                this.registerContextMenus();
            } else {
                chrome.contextMenus.removeAll();
            }
        }
        this.onSettingsChanged();
    }

    setTheme($theme: Partial<FilterConfig>) {
        this.user.set({theme: {...this.user.settings.theme, ...$theme}});

        if (this.isEnabled && this.user.settings.changeBrowserTheme) {
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
        if (!this.icon) {
            this.icon = new IconManager();
        }

        this.recalculateIsEnabled();
        if (this.isEnabled) {
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

    private async onSettingsChanged() {
        if (!this.user.settings) {
            await this.user.loadSettings();
        }
        await this.stateManager.loadState();
        this.wasEnabledOnLastCheck = this.isEnabled;
        this.tabs.sendMessage();
        this.saveUserSettings();
        this.reportChanges();
        this.stateManager.saveState();
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
            isInjected: null
        };
    }

    private getTabMessage = (url: string, frameURL: string): TabData => {
        const urlInfo = this.getURLInfo(url);
        if (this.isEnabled && isURLEnabled(url, this.user.settings, urlInfo)) {
            const custom = this.user.settings.customThemes.find(({url: urlList}) => isURLInList(url, urlList));
            const preset = custom ? null : this.user.settings.presets.find(({urls}) => isURLInList(url, urls));
            const theme = custom ? custom.theme : preset ? preset.theme : this.user.settings.theme;

            logInfo(`Creating CSS for url: ${url}`);
            logInfo(`Custom theme ${custom ? 'was found' : 'was not found'}, Preset theme ${preset ? 'was found' : 'was not found'}
            The theme(${custom ? 'custom' : preset ? 'preset' : 'global'} settings) used is: ${JSON.stringify(theme)}`);
            switch (theme.engine) {
                case ThemeEngines.cssFilter: {
                    return {
                        type: MessageType.BG_ADD_CSS_FILTER,
                        data: createCSSFilterStylesheet(theme, url, frameURL, this.config.INVERSION_FIXES_RAW, this.config.INVERSION_FIXES_INDEX),
                    };
                }
                case ThemeEngines.svgFilter: {
                    if (isFirefox) {
                        return {
                            type: MessageType.BG_ADD_CSS_FILTER,
                            data: createSVGFilterStylesheet(theme, url, frameURL, this.config.INVERSION_FIXES_RAW, this.config.INVERSION_FIXES_INDEX),
                        };
                    }
                    return {
                        type: MessageType.BG_ADD_SVG_FILTER,
                        data: {
                            css: createSVGFilterStylesheet(theme, url, frameURL, this.config.INVERSION_FIXES_RAW, this.config.INVERSION_FIXES_INDEX),
                            svgMatrix: getSVGFilterMatrixValue(theme),
                            svgReverseMatrix: getSVGReverseFilterMatrixValue(),
                        },
                    };
                }
                case ThemeEngines.staticTheme: {
                    return {
                        type: MessageType.BG_ADD_STATIC_THEME,
                        data: theme.stylesheet && theme.stylesheet.trim() ?
                            theme.stylesheet :
                            createStaticStylesheet(theme, url, frameURL, this.config.STATIC_THEMES_RAW, this.config.STATIC_THEMES_INDEX),
                    };
                }
                case ThemeEngines.dynamicTheme: {
                    const filter = {...theme};
                    delete filter.engine;
                    const fixes = getDynamicThemeFixesFor(url, frameURL, this.config.DYNAMIC_THEME_FIXES_RAW, this.config.DYNAMIC_THEME_FIXES_INDEX, this.user.settings.enableForPDF);
                    const isIFrame = frameURL != null;
                    return {
                        type: MessageType.BG_ADD_DYNAMIC_THEME,
                        data: {filter, fixes, isIFrame},
                    };
                }
                default: {
                    throw new Error(`Unknown engine ${theme.engine}`);
                }
            }
        }

        logInfo(`Site is not inverted: ${url}`);
        return {
            type: MessageType.BG_CLEAN_UP,
        };
    };

    //-------------------------------------
    //          User settings

    private async saveUserSettings() {
        await this.user.saveSettings();
        logInfo('saved', this.user.settings);
    }
}
