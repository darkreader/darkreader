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
import {ThemeEngine} from '../generators/theme-engines';
import createCSSFilterStylesheet from '../generators/css-filter';
import {getDynamicThemeFixesFor} from '../generators/dynamic-theme';
import createStaticStylesheet from '../generators/static-theme';
import {createSVGFilterStylesheet, getSVGFilterMatrixValue, getSVGReverseFilterMatrixValue} from '../generators/svg-filter';
import type {ExtensionData, FilterConfig, Shortcuts, UserSettings, TabInfo, TabData, Command} from '../definitions';
import {isSystemDarkModeEnabled, runColorSchemeChangeDetector} from '../utils/media-query';
import {isFirefox} from '../utils/platform';
import {MessageType} from '../utils/message';
import {logInfo, logWarn} from './utils/log';
import {PromiseBarrier} from '../utils/promise-barrier';
import {StateManager} from '../utils/state-manager';
import {debounce} from '../utils/debounce';
import ContentScriptManager from './content-script-manager';
import {AutomationMode} from '../utils/automation';

type AutomationState = 'turn-on' | 'turn-off' | 'scheme-dark' | 'scheme-light' | '';

interface ExtensionState {
    autoState: AutomationState;
    wasEnabledOnLastCheck: boolean;
    registeredContextMenus: boolean;
}

interface SystemColorState {
    wasLastColorSchemeDark: boolean | null;
}

declare const __CHROMIUM_MV3__: boolean;
declare const __THUNDERBIRD__: boolean;

export class Extension {
    private static autoState: AutomationState = '';
    private static wasEnabledOnLastCheck: boolean = null;
    private static registeredContextMenus: boolean = null;
    /**
     * This value is used for two purposes:
     *  - to bypass Firefox bug
     *  - to filter out excessive Extension.onColorSchemeChange() invocations
     */
    private static wasLastColorSchemeDark: boolean = null;
    private static startBarrier: PromiseBarrier<void, void> = null;
    private static stateManager: StateManager<ExtensionState> = null;

    private static ALARM_NAME = 'auto-time-alarm';
    private static LOCAL_STORAGE_KEY = 'Extension-state';

    // Store system color theme
    private static SYSTEM_COLOR_LOCAL_STORAGE_KEY = 'system-color-state';
    private static systemColorStateManager: StateManager<SystemColorState>;

    static init() {
        new Newsmaker();
        DevTools.init(async () => this.onSettingsChanged());
        Messenger.init(this.getMessengerAdapter());
        TabManager.init({
            getConnectionMessage: async ({url, frameURL}) => this.getConnectionMessage(url, frameURL),
            getTabMessage: this.getTabMessage,
            onColorSchemeChange: this.onColorSchemeChange,
        });

        this.startBarrier = new PromiseBarrier();
        this.stateManager = new StateManager<ExtensionState>(Extension.LOCAL_STORAGE_KEY, this, {
            autoState: '',
            wasEnabledOnLastCheck: null,
            registeredContextMenus: null,
        }, logWarn);

        chrome.alarms.onAlarm.addListener(this.alarmListener);

        if (chrome.commands) {
            // Firefox Android does not support chrome.commands
            chrome.commands.onCommand.addListener(async (command) => this.onCommand(command as Command));
        }

        if (chrome.permissions.onRemoved) {
            chrome.permissions.onRemoved.addListener((permissions) => {
                // As far as we know, this code is never actually run because there
                // is no browser UI for removing 'contextMenus' permission.
                // This code exists for future-proofing in case browsers ever add such UI.
                if (!permissions?.permissions?.includes('contextMenus')) {
                    this.registeredContextMenus = false;
                }
            });
        }
    }

    private static async MV3syncSystemColorStateManager(isDark: boolean | null): Promise<void> {
        if (!__CHROMIUM_MV3__) {
            return;
        }
        if (!this.systemColorStateManager) {
            this.systemColorStateManager = new StateManager<SystemColorState>(Extension.SYSTEM_COLOR_LOCAL_STORAGE_KEY, this, {
                wasLastColorSchemeDark: isDark,
            }, logWarn);
        }
        if (isDark === null) {
            // Attempt to restore data from storage
            return this.systemColorStateManager.loadState();
        } else if (this.wasLastColorSchemeDark !== isDark) {
            this.wasLastColorSchemeDark = isDark;
            return this.systemColorStateManager.saveState();
        }
    }

    private static alarmListener = (alarm: chrome.alarms.Alarm): void => {
        if (alarm.name === Extension.ALARM_NAME) {
            this.loadData().then(() => this.handleAutomationCheck());
        }
    };

    private static isExtensionSwitchedOn() {
        return (
            this.autoState === 'turn-on' ||
            this.autoState === 'scheme-dark' ||
            this.autoState === 'scheme-light' ||
            (this.autoState === '' && UserStorage.settings.enabled)
        );
    }

    private static updateAutoState() {
        const {mode, behavior, enabled} = UserStorage.settings.automation;

        let isAutoDark: boolean;
        let nextCheck: number;
        switch (mode) {
            case AutomationMode.TIME: {
                const {time} = UserStorage.settings;
                isAutoDark = isInTimeIntervalLocal(time.activation, time.deactivation);
                nextCheck = nextTimeInterval(time.activation, time.deactivation);
                break;
            }
            case AutomationMode.SYSTEM:
                if (__CHROMIUM_MV3__) {
                    isAutoDark = this.wasLastColorSchemeDark;
                    if (this.wasLastColorSchemeDark === null) {
                        logWarn('System color scheme is unknown. Defaulting to Dark.');
                        isAutoDark = true;
                    }
                    break;
                }
                isAutoDark = this.wasLastColorSchemeDark === null
                    ? isSystemDarkModeEnabled()
                    : this.wasLastColorSchemeDark;
                if (isFirefox) {
                    runColorSchemeChangeDetector(Extension.onColorSchemeChange);
                }
                break;
            case AutomationMode.LOCATION: {
                const {latitude, longitude} = UserStorage.settings.location;
                if (latitude != null && longitude != null) {
                    isAutoDark = isNightAtLocation(latitude, longitude);
                    nextCheck = nextTimeChangeAtLocation(latitude, longitude);
                }
                break;
            }
            case AutomationMode.NONE:
                break;
        }

        let state: AutomationState = '';
        if (enabled) {
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

    static async start() {
        await Promise.all([
            ConfigManager.load({local: true}),
            this.MV3syncSystemColorStateManager(null),
            UserStorage.loadSettings()
        ]);

        if (UserStorage.settings.enableContextMenus && !this.registeredContextMenus) {
            chrome.permissions.contains({permissions: ['contextMenus']}, (permitted) => {
                if (permitted) {
                    this.registerContextMenus();
                } else {
                    logWarn('User has enabled context menus, but did not provide permission.');
                }
            });
        }
        if (UserStorage.settings.syncSitesFixes) {
            await ConfigManager.load({local: false});
        }
        this.updateAutoState();
        this.onAppToggle();
        logInfo('loaded', UserStorage.settings);

        if (__THUNDERBIRD__) {
            TabManager.registerMailDisplayScript();
        } else {
            TabManager.updateContentScript({runOnProtectedPages: UserStorage.settings.enableForProtectedPages});
        }

        UserStorage.settings.fetchNews && Newsmaker.subscribe();
        this.startBarrier.resolve();
    }

    private static getMessengerAdapter(): ExtensionAdapter {
        return {
            collect: async () => {
                return await this.collectData();
            },
            changeSettings: (settings) => this.changeSettings(settings),
            setTheme: (theme) => this.setTheme(theme),
            setShortcut: ({command, shortcut}) => this.setShortcut(command, shortcut),
            toggleActiveTab: async () => this.toggleActiveTab(),
            markNewsAsRead: async (ids) => await Newsmaker.markAsRead(...ids),
            markNewsAsDisplayed: async (ids) => await Newsmaker.markAsDisplayed(...ids),
            loadConfig: async (options) => await ConfigManager.load(options),
            applyDevDynamicThemeFixes: (text) => DevTools.applyDynamicThemeFixes(text),
            resetDevDynamicThemeFixes: () => DevTools.resetDynamicThemeFixes(),
            applyDevInversionFixes: (text) => DevTools.applyInversionFixes(text),
            resetDevInversionFixes: () => DevTools.resetInversionFixes(),
            applyDevStaticThemes: (text) => DevTools.applyStaticThemes(text),
            resetDevStaticThemes: () => DevTools.resetStaticThemes(),
        };
    }

    private static onCommandInternal = async (command: Command, frameURL?: string) => {
        if (this.startBarrier.isPending()) {
            await this.startBarrier.entry();
        }
        this.stateManager.loadState();
        switch (command) {
            case 'toggle':
                logInfo('Toggle command entered');
                this.changeSettings({
                    enabled: !this.isExtensionSwitchedOn(),
                    automation: {...UserStorage.settings.automation, ...{enable: false}},
                });
                break;
            case 'addSite': {
                logInfo('Add Site command entered');
                const url = frameURL || await TabManager.getActiveTabURL();
                if (isPDF(url)) {
                    this.changeSettings({enableForPDF: !UserStorage.settings.enableForPDF});
                } else {
                    this.toggleActiveTab();
                }
                break;
            }
            case 'switchEngine': {
                logInfo('Switch Engine command entered');
                const engines = Object.values(ThemeEngine);
                const index = engines.indexOf(UserStorage.settings.theme.engine);
                const next = engines[(index + 1) % engines.length];
                this.setTheme({engine: next});
                break;
            }
        }
    };

    // 75 is small enough to not notice it, and still catches when someone
    // is holding down a certain shortcut.
    private static onCommand = debounce(75, this.onCommandInternal);

    private static registerContextMenus() {
        chrome.contextMenus.onClicked.addListener(async ({menuItemId, frameUrl, pageUrl}) =>
            this.onCommand(menuItemId as Command, frameUrl || pageUrl));
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
                    id: 'toggle',
                    parentId: 'DarkReader-top',
                    title: msgToggle || 'Toggle everywhere',
                });
                chrome.contextMenus.create({
                    id: 'addSite',
                    parentId: 'DarkReader-top',
                    title: msgAddSite || 'Toggle for current site',
                });
                chrome.contextMenus.create({
                    id: 'switchEngine',
                    parentId: 'DarkReader-top',
                    title: msgSwitchEngine || 'Switch engine',
                });
                this.registeredContextMenus = true;
            });
        });
    }

    private static async getShortcuts() {
        const commands = await getCommands();
        return commands.reduce((map, cmd) => Object.assign(map, {[cmd.name]: cmd.shortcut}), {} as Shortcuts);
    }

    private static setShortcut(command: string, shortcut: string) {
        setShortcut(command, shortcut);
    }

    static async collectData(): Promise<ExtensionData> {
        await this.loadData();
        const [
            news,
            shortcuts,
            dynamicFixesText,
            filterFixesText,
            staticThemesText,
            activeTab
        ] = await Promise.all([
            Newsmaker.getLatest(),
            this.getShortcuts(),
            DevTools.getDynamicThemeFixesText(),
            DevTools.getInversionFixesText(),
            DevTools.getStaticThemesText(),
            this.getActiveTabInfo()
        ]);
        return {
            isEnabled: this.isExtensionSwitchedOn(),
            isReady: true,
            settings: UserStorage.settings,
            news,
            shortcuts,
            colorScheme: ConfigManager.COLOR_SCHEMES_RAW,
            forcedScheme: this.autoState === 'scheme-dark' ? 'dark' : this.autoState === 'scheme-light' ? 'light' : null,
            devtools: {
                dynamicFixesText,
                filterFixesText,
                staticThemesText,
            },
            activeTab,
        };
    }

    private static async getActiveTabInfo() {
        await this.loadData();
        const url = await TabManager.getActiveTabURL();
        const info = this.getURLInfo(url);
        info.isInjected = await TabManager.canAccessActiveTab();
        if (UserStorage.settings.detectDarkTheme) {
            info.isDarkThemeDetected = await TabManager.isActiveTabDarkThemeDetected();
        }
        return info;
    }

    private static async getConnectionMessage(url: string, frameURL: string) {
        await this.loadData();
        return this.getTabMessage(url, frameURL);
    }

    private static async loadData() {
        const promises = [this.stateManager.loadState()];
        if (!UserStorage.settings) {
            promises.push(UserStorage.loadSettings());
        }
        await Promise.all(promises);
    }

    private static onColorSchemeChange = async (isDark: boolean) => {
        if (this.wasLastColorSchemeDark === isDark) {
            // If color scheme was already correct, we do not need to do anyhting
            return;
        }
        this.wasLastColorSchemeDark = isDark;
        this.MV3syncSystemColorStateManager(isDark);
        await this.loadData();
        if (UserStorage.settings.automation.mode !== AutomationMode.SYSTEM) {
            return;
        }
        this.handleAutomationCheck();
    };

    private static handleAutomationCheck = () => {
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
            TabManager.sendMessage();
            this.reportChanges();
            this.stateManager.saveState();
        }
    };

    static changeSettings($settings: Partial<UserSettings>, onlyUpdateActiveTab = false) {
        const prev = {...UserStorage.settings};

        UserStorage.set($settings);

        if (
            (prev.enabled !== UserStorage.settings.enabled) ||
            (prev.automation.enabled !== UserStorage.settings.automation.enabled) ||
            (prev.automation.mode !== UserStorage.settings.automation.mode) ||
            (prev.automation.behavior !== UserStorage.settings.automation.behavior) ||
            (prev.time.activation !== UserStorage.settings.time.activation) ||
            (prev.time.deactivation !== UserStorage.settings.time.deactivation) ||
            (prev.location.latitude !== UserStorage.settings.location.latitude) ||
            (prev.location.longitude !== UserStorage.settings.location.longitude)
        ) {
            this.updateAutoState();
            this.onAppToggle();
        }
        if (prev.syncSettings !== UserStorage.settings.syncSettings) {
            UserStorage.saveSyncSetting(UserStorage.settings.syncSettings);
        }
        if (this.isExtensionSwitchedOn() && $settings.changeBrowserTheme != null && prev.changeBrowserTheme !== $settings.changeBrowserTheme) {
            if ($settings.changeBrowserTheme) {
                setWindowTheme(UserStorage.settings.theme);
            } else {
                resetWindowTheme();
            }
        }
        if (prev.fetchNews !== UserStorage.settings.fetchNews) {
            UserStorage.settings.fetchNews ? Newsmaker.subscribe() : Newsmaker.unSubscribe();
        }

        if (prev.enableContextMenus !== UserStorage.settings.enableContextMenus) {
            if (UserStorage.settings.enableContextMenus) {
                this.registerContextMenus();
            } else {
                chrome.contextMenus.removeAll();
            }
        }
        this.onSettingsChanged(onlyUpdateActiveTab);
    }

    private static setTheme($theme: Partial<FilterConfig>) {
        UserStorage.set({theme: {...UserStorage.settings.theme, ...$theme}});

        if (this.isExtensionSwitchedOn() && UserStorage.settings.changeBrowserTheme) {
            setWindowTheme(UserStorage.settings.theme);
        }

        this.onSettingsChanged();
    }

    private static async reportChanges() {
        const info = await this.collectData();
        Messenger.reportChanges(info);
    }

    private static async toggleActiveTab() {
        const settings = UserStorage.settings;
        const tab = await this.getActiveTabInfo();
        const {url} = tab;
        const isInDarkList = isURLInList(url, ConfigManager.DARK_SITES);
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
            this.changeSettings({siteListEnabled: toggledList}, true);
            return;
        }

        const toggledList = getToggledList(settings.siteList);
        this.changeSettings({siteList: toggledList}, true);
    }

    //------------------------------------
    //
    //       Handle config changes
    //

    private static onAppToggle() {
        if (this.isExtensionSwitchedOn()) {
            if (__CHROMIUM_MV3__) {
                ContentScriptManager.registerScripts(async () => TabManager.updateContentScript({runOnProtectedPages: UserStorage.settings.enableForProtectedPages}));
            }
            IconManager.setActive();
        } else {
            if (__CHROMIUM_MV3__) {
                ContentScriptManager.unregisterScripts();
            }
            IconManager.setInactive();
        }

        if (UserStorage.settings.changeBrowserTheme) {
            if (this.isExtensionSwitchedOn() && this.autoState !== 'scheme-light') {
                setWindowTheme(UserStorage.settings.theme);
            } else {
                resetWindowTheme();
            }
        }
    }

    private static async onSettingsChanged(onlyUpdateActiveTab = false) {
        await this.loadData();
        this.wasEnabledOnLastCheck = this.isExtensionSwitchedOn();
        TabManager.sendMessage(onlyUpdateActiveTab);
        this.saveUserSettings();
        this.reportChanges();
        this.stateManager.saveState();
    }

    //----------------------
    //
    // Add/remove css to tab
    //
    //----------------------

    private static getURLInfo(url: string): TabInfo {
        const {DARK_SITES} = ConfigManager;
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

    private static getTabMessage = (url: string, frameURL: string): TabData => {
        const settings = UserStorage.settings;
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
                case ThemeEngine.cssFilter: {
                    return {
                        type: MessageType.BG_ADD_CSS_FILTER,
                        data: {
                            css: createCSSFilterStylesheet(theme, url, frameURL, ConfigManager.INVERSION_FIXES_RAW, ConfigManager.INVERSION_FIXES_INDEX),
                            detectDarkTheme,
                        },
                    };
                }
                case ThemeEngine.svgFilter: {
                    if (isFirefox) {
                        return {
                            type: MessageType.BG_ADD_CSS_FILTER,
                            data: {
                                css: createSVGFilterStylesheet(theme, url, frameURL, ConfigManager.INVERSION_FIXES_RAW, ConfigManager.INVERSION_FIXES_INDEX),
                                detectDarkTheme,
                            },
                        };
                    }
                    return {
                        type: MessageType.BG_ADD_SVG_FILTER,
                        data: {
                            css: createSVGFilterStylesheet(theme, url, frameURL, ConfigManager.INVERSION_FIXES_RAW, ConfigManager.INVERSION_FIXES_INDEX),
                            svgMatrix: getSVGFilterMatrixValue(theme),
                            svgReverseMatrix: getSVGReverseFilterMatrixValue(),
                            detectDarkTheme,
                        },
                    };
                }
                case ThemeEngine.staticTheme: {
                    return {
                        type: MessageType.BG_ADD_STATIC_THEME,
                        data: {
                            css: theme.stylesheet && theme.stylesheet.trim() ?
                                theme.stylesheet :
                                createStaticStylesheet(theme, url, frameURL, ConfigManager.STATIC_THEMES_RAW, ConfigManager.STATIC_THEMES_INDEX),
                            detectDarkTheme: settings.detectDarkTheme,
                        },
                    };
                }
                case ThemeEngine.dynamicTheme: {
                    const fixes = getDynamicThemeFixesFor(url, frameURL, ConfigManager.DYNAMIC_THEME_FIXES_RAW, ConfigManager.DYNAMIC_THEME_FIXES_INDEX, UserStorage.settings.enableForPDF);
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

    private static async saveUserSettings() {
        await UserStorage.saveSettings();
        logInfo('saved', UserStorage.settings);
    }
}
