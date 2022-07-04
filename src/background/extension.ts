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
import {debounce} from '../utils/debounce';

type AutomationState = 'turn-on' | 'turn-off' | 'scheme-dark' | 'scheme-light' | '';

interface ExtensionState {
    autoState: AutomationState;
    wasEnabledOnLastCheck: boolean;
    registeredContextMenus: boolean;
}

interface SystemColorState {
    isDark: boolean | null;
}

declare const __DEBUG__: boolean;

export class Extension implements ExtensionState {
    config: ConfigManager;
    devtools: DevTools;
    icon: IconManager;
    messenger: Messenger;
    news: Newsmaker;
    tabs: TabManager;
    user: UserStorage;

    autoState: AutomationState = '';
    wasEnabledOnLastCheck: boolean = null;
    registeredContextMenus: boolean = null;
    private popupOpeningListener: () => void = null;
    // Is used only with Firefox to bypass Firefox bug
    private wasLastColorSchemeDark: boolean = null;
    private startBarrier: PromiseBarrier<void, void> = null;
    private stateManager: StateManager<ExtensionState> = null;

    private static ALARM_NAME = 'auto-time-alarm';
    private static LOCAL_STORAGE_KEY = 'Extension-state';

    // Store system color theme
    private static SYSTEM_COLOR_LOCAL_STORAGE_KEY = 'system-color-state';
    private systemColorStateManager: StateManager<SystemColorState>;
    private isDark: boolean | null = null;

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
        this.user = new UserStorage();
        this.startBarrier = new PromiseBarrier();
        this.stateManager = new StateManager<ExtensionState>(Extension.LOCAL_STORAGE_KEY, this, {
            autoState: '',
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

    private async MV3initSystemColorStateManager(isDark: boolean | null): Promise<void> {
        if (!isMV3) {
            return;
        }
        if (!this.systemColorStateManager) {
            this.systemColorStateManager = new StateManager<SystemColorState>(Extension.SYSTEM_COLOR_LOCAL_STORAGE_KEY, this, {
                isDark,
            });
        }
        if (isDark === null) {
            // Attempt to restore data from storage
            return this.systemColorStateManager.loadState();
        } else if (this.isDark !== isDark) {
            this.isDark = isDark;
            return this.systemColorStateManager.saveState();
        }
    }

    private async MV3saveSystemColorStateManager(): Promise<void> {
        if (!isMV3) {
            return;
        }
        if (!this.systemColorStateManager) {
            logWarn('MV3saveSystemColorStateManager() called before MV3initSystemColorStateManager()');
            return;
        }
        return this.systemColorStateManager.saveState();
    }

    private alarmListener = (alarm: chrome.alarms.Alarm): void => {
        if (alarm.name === Extension.ALARM_NAME) {
            this.callWhenSettingsLoaded(() => {
                this.handleAutomationCheck();
            });
        }
    };

    private isExtensionSwitchedOn() {
        return (
            this.autoState === 'turn-on' ||
            this.autoState === 'scheme-dark' ||
            this.autoState === 'scheme-light' ||
            (this.autoState === '' && this.user.settings.enabled)
        );
    }

    private updateAutoState() {
        const {automation, automationBehaviour: behavior} = this.user.settings;

        let isAutoDark: boolean;
        let nextCheck: number;
        switch (automation) {
            case 'time': {
                const {time} = this.user.settings;
                isAutoDark = isInTimeIntervalLocal(time.activation, time.deactivation);
                nextCheck = nextTimeInterval(time.activation, time.deactivation);
                break;
            }
            case 'system':
                if (isMV3) {
                    isAutoDark = this.isDark;
                    if (this.isDark === null) {
                        logWarn('System color scheme is unknown. Defaulting to Dark.');
                        isAutoDark = true;
                    }
                    break;
                }
                if (isFirefox) {
                    // BUG: Firefox background page always matches initial color scheme.
                    isAutoDark = this.wasLastColorSchemeDark == null
                        ? isSystemDarkModeEnabled()
                        : this.wasLastColorSchemeDark;
                } else {
                    isAutoDark = isSystemDarkModeEnabled();
                }
                break;
            case 'location': {
                const {latitude, longitude} = this.user.settings.location;
                if (latitude != null && longitude != null) {
                    isAutoDark = isNightAtLocation(latitude, longitude);
                    nextCheck = nextTimeChangeAtLocation(latitude, longitude);
                }
                break;
            }
            case '':
                break;
        }

        let state: AutomationState = '';
        if (automation) {
            if (behavior === 'OnOff') {
                state = isAutoDark ? 'turn-on' : 'turn-off';
            } else if (behavior === 'Scheme') {
                state = isAutoDark ? 'scheme-dark' : 'scheme-light';
            }
        }
        this.autoState = state;

        if (nextCheck) {
            if (nextCheck < Date.now()) {
                logWarn(`Alarm is set in the past: ${nextCheck}. The time is: ${new Date()}. ISO: ${(new Date()).toISOString()}`);
            } else {
                chrome.alarms.create(Extension.ALARM_NAME, {when: nextCheck});
            }
        }
    }

    async start() {
        await this.config.load({local: true});
        await this.MV3initSystemColorStateManager(null);

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
        this.updateAutoState();
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
            changeSettings: (settings) => this.changeSettings(settings),
            setTheme: (theme) => this.setTheme(theme),
            setShortcut: ({command, shortcut}) => this.setShortcut(command, shortcut),
            toggleActiveTab: async () => this.toggleActiveTab(),
            markNewsAsRead: async (ids) => await this.news.markAsRead(...ids),
            markNewsAsDisplayed: async (ids) => await this.news.markAsDisplayed(...ids),
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

    private onCommandInternal = async (command: string, frameURL?: string) => {
        if (this.startBarrier.isPending()) {
            await this.startBarrier.entry();
        }
        this.stateManager.loadState();
        switch (command) {
            case 'toggle':
                logInfo('Toggle command entered');
                this.changeSettings({
                    enabled: !this.isExtensionSwitchedOn(),
                    automation: '',
                });
                break;
            case 'addSite': {
                logInfo('Add Site command entered');
                const url = frameURL || await this.tabs.getActiveTabURL();
                if (isPDF(url)) {
                    this.changeSettings({enableForPDF: !this.user.settings.enableForPDF});
                } else {
                    this.toggleActiveTab();
                }
                break;
            }
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

    // 75 is small enough to not notice it, and still catches when someone
    // is holding down a certain shortcut.
    onCommand = debounce(75, this.onCommandInternal);

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
            isEnabled: this.isExtensionSwitchedOn(),
            isReady: true,
            settings: this.user.settings,
            news: await this.news.getLatest(),
            shortcuts: await this.getShortcuts(),
            colorScheme: this.config.COLOR_SCHEMES_RAW,
            forcedScheme: this.autoState === 'scheme-dark' ? 'dark' : this.autoState === 'scheme-light' ? 'light' : null,
            devtools: {
                dynamicFixesText: await this.devtools.getDynamicThemeFixesText(),
                filterFixesText: await this.devtools.getInversionFixesText(),
                staticThemesText: await this.devtools.getStaticThemesText(),
                hasCustomDynamicFixes: await this.devtools.hasCustomDynamicThemeFixes(),
                hasCustomFilterFixes: await this.devtools.hasCustomFilterFixes(),
                hasCustomStaticFixes: await this.devtools.hasCustomStaticFixes(),
            },
            activeTab: await this.getActiveTabInfo(),
        };
    }

    private async getActiveTabInfo() {
        if (!this.user.settings) {
            await this.user.loadSettings();
        }
        await this.stateManager.loadState();
        const url = await this.tabs.getActiveTabURL();
        const info = this.getURLInfo(url);
        info.isInjected = await this.tabs.canAccessActiveTab();
        if (this.user.settings.detectDarkTheme) {
            info.isDarkThemeDetected = await this.tabs.isActiveTabDarkThemeDetected();
        }
        return info;
    }

    private onNewsUpdate(news: News[]) {
        if (!this.icon) {
            this.icon = new IconManager();
        }

        const latestNews = news.length > 0 && news[0];
        if (latestNews && latestNews.badge && !latestNews.read && !latestNews.displayed) {
            this.icon.showBadge(latestNews.badge);
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

    private callWhenSettingsLoaded(callback: () => void) {
        if (this.user.settings) {
            callback();
            return;
        }
        this.user.loadSettings()
            .then(async () => {
                await this.stateManager.loadState();
                callback();
            });
    }

    private onColorSchemeChange = (isDark: boolean) => {
        this.MV3initSystemColorStateManager(isDark);
        if (isFirefox) {
            this.wasLastColorSchemeDark = isDark;
        }
        if (this.user.settings.automation !== 'system') {
            return;
        }
        this.callWhenSettingsLoaded(() => {
            this.handleAutomationCheck();
        });
    };

    private handleAutomationCheck = () => {
        this.updateAutoState();

        const isSwitchedOn = this.isExtensionSwitchedOn();
        if (
            this.wasEnabledOnLastCheck === null ||
            this.wasEnabledOnLastCheck !== isSwitchedOn ||
            this.autoState === 'scheme-dark' ||
            this.autoState === 'scheme-light'
        ) {
            this.wasEnabledOnLastCheck = isSwitchedOn;
            this.onAppToggle();
            this.tabs.sendMessage();
            this.reportChanges();
            this.stateManager.saveState();
        }
    };

    changeSettings($settings: Partial<UserSettings>) {
        const prev = {...this.user.settings};

        this.user.set($settings);

        if (
            (prev.enabled !== this.user.settings.enabled) ||
            (prev.automation !== this.user.settings.automation) ||
            (prev.automationBehaviour !== this.user.settings.automationBehaviour) ||
            (prev.time.activation !== this.user.settings.time.activation) ||
            (prev.time.deactivation !== this.user.settings.time.deactivation) ||
            (prev.location.latitude !== this.user.settings.location.latitude) ||
            (prev.location.longitude !== this.user.settings.location.longitude)
        ) {
            this.updateAutoState();
            this.onAppToggle();
        }
        if (prev.syncSettings !== this.user.settings.syncSettings) {
            this.user.saveSyncSetting(this.user.settings.syncSettings);
        }
        if (this.isExtensionSwitchedOn() && $settings.changeBrowserTheme != null && prev.changeBrowserTheme !== $settings.changeBrowserTheme) {
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

        if (this.isExtensionSwitchedOn() && this.user.settings.changeBrowserTheme) {
            setWindowTheme(this.user.settings.theme);
        }

        this.onSettingsChanged();
    }

    private async reportChanges() {
        const info = await this.collectData();
        this.messenger.reportChanges(info);
    }

    async toggleActiveTab() {
        const settings = this.user.settings;
        const tab = await this.getActiveTabInfo();
        const {url} = tab;
        const isInDarkList = isURLInList(url, this.config.DARK_SITES);
        const host = getURLHostOrProtocol(url);

        function getToggledList(sourceList: string[]) {
            const list = sourceList.slice();
            const index = list.indexOf(host);
            if (index < 0) {
                list.push(host);
            } else {
                list.splice(index, 1);
            }
            return list;
        }

        const darkThemeDetected = !settings.applyToListedOnly && settings.detectDarkTheme && tab.isDarkThemeDetected;
        if (isInDarkList || darkThemeDetected || settings.siteListEnabled.includes(host)) {
            const toggledList = getToggledList(settings.siteListEnabled);
            this.changeSettings({siteListEnabled: toggledList});
            return;
        }

        const toggledList = getToggledList(settings.siteList);
        this.changeSettings({siteList: toggledList});
    }

    //------------------------------------
    //
    //       Handle config changes
    //

    private onAppToggle() {
        if (!this.icon) {
            this.icon = new IconManager();
        }

        if (this.isExtensionSwitchedOn()) {
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
        this.wasEnabledOnLastCheck = this.isExtensionSwitchedOn();
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
            isInjected: null,
            isDarkThemeDetected: null,
        };
    }

    private getTabMessage = (url: string, frameURL: string): TabData => {
        const settings = this.user.settings;
        const urlInfo = this.getURLInfo(url);
        if (this.isExtensionSwitchedOn() && isURLEnabled(url, settings, urlInfo)) {
            const custom = settings.customThemes.find(({url: urlList}) => isURLInList(url, urlList));
            const preset = custom ? null : settings.presets.find(({urls}) => isURLInList(url, urls));
            let theme = custom ? custom.theme : preset ? preset.theme : settings.theme;
            if (this.autoState === 'scheme-dark' || this.autoState === 'scheme-light') {
                const mode = this.autoState === 'scheme-dark' ? 1 : 0;
                theme = {...theme, mode};
            }
            const isIFrame = frameURL != null;
            const detectDarkTheme = !isIFrame && settings.detectDarkTheme && !isURLInList(url, settings.siteListEnabled) && !isPDF(url);

            logInfo(`Creating CSS for url: ${url}`);
            logInfo(`Custom theme ${custom ? 'was found' : 'was not found'}, Preset theme ${preset ? 'was found' : 'was not found'}
            The theme(${custom ? 'custom' : preset ? 'preset' : 'global'} settings) used is: ${JSON.stringify(theme)}`);
            switch (theme.engine) {
                case ThemeEngines.cssFilter: {
                    return {
                        type: MessageType.BG_ADD_CSS_FILTER,
                        data: {
                            css: createCSSFilterStylesheet(theme, url, frameURL, this.config.INVERSION_FIXES_RAW, this.config.INVERSION_FIXES_INDEX),
                            detectDarkTheme,
                        },
                    };
                }
                case ThemeEngines.svgFilter: {
                    if (isFirefox) {
                        return {
                            type: MessageType.BG_ADD_CSS_FILTER,
                            data: {
                                css: createSVGFilterStylesheet(theme, url, frameURL, this.config.INVERSION_FIXES_RAW, this.config.INVERSION_FIXES_INDEX),
                                detectDarkTheme,
                            },
                        };
                    }
                    return {
                        type: MessageType.BG_ADD_SVG_FILTER,
                        data: {
                            css: createSVGFilterStylesheet(theme, url, frameURL, this.config.INVERSION_FIXES_RAW, this.config.INVERSION_FIXES_INDEX),
                            svgMatrix: getSVGFilterMatrixValue(theme),
                            svgReverseMatrix: getSVGReverseFilterMatrixValue(),
                            detectDarkTheme,
                        },
                    };
                }
                case ThemeEngines.staticTheme: {
                    return {
                        type: MessageType.BG_ADD_STATIC_THEME,
                        data: {
                            css: theme.stylesheet && theme.stylesheet.trim() ?
                                theme.stylesheet :
                                createStaticStylesheet(theme, url, frameURL, this.config.STATIC_THEMES_RAW, this.config.STATIC_THEMES_INDEX),
                            detectDarkTheme: settings.detectDarkTheme,
                        },
                    };
                }
                case ThemeEngines.dynamicTheme: {
                    const fixes = getDynamicThemeFixesFor(url, frameURL, this.config.DYNAMIC_THEME_FIXES_RAW, this.config.DYNAMIC_THEME_FIXES_INDEX, this.user.settings.enableForPDF);
                    return {
                        type: MessageType.BG_ADD_DYNAMIC_THEME,
                        data: {
                            theme,
                            fixes,
                            isIFrame,
                            detectDarkTheme,
                        },
                    };
                }
                default:
                    throw new Error(`Unknown engine ${theme.engine}`);
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
