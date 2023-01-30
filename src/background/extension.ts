import ConfigManager from './config-manager';
import DevTools from './devtools';
import IconManager from './icon-manager';
import type {ExtensionAdapter} from './messenger';
import Messenger from './messenger';
import Newsmaker from './newsmaker';
import TabManager from './tab-manager';
import UserStorage from './user-storage';
import {setWindowTheme, resetWindowTheme} from './window-theme';
import {getCommands, canInjectScript} from './utils/extension-api';
import {isInTimeIntervalLocal, nextTimeInterval, isNightAtLocation, nextTimeChangeAtLocation} from '../utils/time';
import {isURLInList, getURLHostOrProtocol, isURLEnabled, isPDF} from '../utils/url';
import {ThemeEngine} from '../generators/theme-engines';
import createCSSFilterStylesheet from '../generators/css-filter';
import {getDynamicThemeFixesFor} from '../generators/dynamic-theme';
import createStaticStylesheet from '../generators/static-theme';
import {createSVGFilterStylesheet, getSVGFilterMatrixValue, getSVGReverseFilterMatrixValue} from '../generators/svg-filter';
import type {ExtensionData, FilterConfig, Shortcuts, UserSettings, TabInfo, TabData, Command, DevToolsData} from '../definitions';
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

interface ExtensionState extends Record<string, unknown> {
    autoState: AutomationState;
    wasEnabledOnLastCheck: boolean | null;
    registeredContextMenus: boolean | null;
}

interface SystemColorState extends Record<string, unknown> {
    wasLastColorSchemeDark: boolean | null;
}

declare const __CHROMIUM_MV2__: boolean;
declare const __CHROMIUM_MV3__: boolean;
declare const __THUNDERBIRD__: boolean;

export class Extension {
    private static autoState: AutomationState = '';
    private static wasEnabledOnLastCheck: boolean | null = null;
    private static registeredContextMenus: boolean | null = null;
    /**
     * This value is used for two purposes:
     *  - to bypass Firefox bug
     *  - to filter out excessive Extension.onColorSchemeChange() invocations
     */
    private static wasLastColorSchemeDark: boolean | null = null;
    private static startBarrier: PromiseBarrier<void, void> | null = null;
    private static stateManager: StateManager<ExtensionState> | null = null;

    private static readonly ALARM_NAME = 'auto-time-alarm';
    private static readonly LOCAL_STORAGE_KEY = 'Extension-state';

    // Store system color theme
    private static readonly SYSTEM_COLOR_LOCAL_STORAGE_KEY = 'system-color-state';
    private static systemColorStateManager: StateManager<SystemColorState>;

    // Record whether Extension.init() already ran since the last GB start
    private static initialized = false;

    // This sync initializer needs to run on every BG restart before anything else can happen
    private static init() {
        if (Extension.initialized) {
            return;
        }
        Extension.initialized = true;

        DevTools.init(Extension.onSettingsChanged);
        Messenger.init(Extension.getMessengerAdapter());
        TabManager.init({
            getConnectionMessage: Extension.getConnectionMessage,
            getTabMessage: Extension.getTabMessage,
            onColorSchemeChange: Extension.onColorSchemeChange,
        });

        Extension.startBarrier = new PromiseBarrier();
        Extension.stateManager = new StateManager<ExtensionState>(Extension.LOCAL_STORAGE_KEY, Extension, {
            autoState: '',
            wasEnabledOnLastCheck: null,
            registeredContextMenus: null,
        }, logWarn);

        chrome.alarms.onAlarm.addListener(Extension.alarmListener);

        if (chrome.commands) {
            // Firefox Android does not support chrome.commands
            if (isFirefox) {
                // Firefox may not register onCommand listener on extension startup so we need to use setTimeout
                setTimeout(() => chrome.commands.onCommand.addListener(async (command) => Extension.onCommand(command as Command, null, null, null)));
            } else {
                chrome.commands.onCommand.addListener(async (command, tab) => Extension.onCommand(command as Command, tab && tab.id! || null, 0, null));
            }
        }

        if (chrome.permissions.onRemoved) {
            chrome.permissions.onRemoved.addListener((permissions) => {
                // As far as we know, this code is never actually run because there
                // is no browser UI for removing 'contextMenus' permission.
                // This code exists for future-proofing in case browsers ever add such UI.
                if (!permissions?.permissions?.includes('contextMenus')) {
                    Extension.registeredContextMenus = false;
                }
            });
        }
    }

    private static async MV3syncSystemColorStateManager(isDark: boolean | null): Promise<void> {
        if (!__CHROMIUM_MV3__) {
            return;
        }
        if (!Extension.systemColorStateManager) {
            Extension.systemColorStateManager = new StateManager<SystemColorState>(Extension.SYSTEM_COLOR_LOCAL_STORAGE_KEY, Extension, {
                wasLastColorSchemeDark: isDark,
            }, logWarn);
        }
        if (isDark === null) {
            // Attempt to restore data from storage
            return Extension.systemColorStateManager.loadState();
        } else if (Extension.wasLastColorSchemeDark !== isDark) {
            Extension.wasLastColorSchemeDark = isDark;
            return Extension.systemColorStateManager.saveState();
        }
    }

    private static alarmListener = (alarm: chrome.alarms.Alarm): void => {
        if (alarm.name === Extension.ALARM_NAME) {
            Extension.loadData().then(() => Extension.handleAutomationCheck());
        }
    };

    private static isExtensionSwitchedOn() {
        return (
            Extension.autoState === 'turn-on' ||
            Extension.autoState === 'scheme-dark' ||
            Extension.autoState === 'scheme-light' ||
            (Extension.autoState === '' && UserStorage.settings.enabled)
        );
    }

    private static updateAutoState() {
        const {mode, behavior, enabled} = UserStorage.settings.automation;

        let isAutoDark: boolean | null | undefined;
        let nextCheck: number | null | undefined;
        switch (mode) {
            case AutomationMode.TIME: {
                const {time} = UserStorage.settings;
                isAutoDark = isInTimeIntervalLocal(time.activation, time.deactivation);
                nextCheck = nextTimeInterval(time.activation, time.deactivation);
                break;
            }
            case AutomationMode.SYSTEM:
                if (__CHROMIUM_MV3__) {
                    isAutoDark = Extension.wasLastColorSchemeDark;
                    if (Extension.wasLastColorSchemeDark === null) {
                        logWarn('System color scheme is unknown. Defaulting to Dark.');
                        isAutoDark = true;
                    }
                    break;
                }
                isAutoDark = Extension.wasLastColorSchemeDark === null
                    ? isSystemDarkModeEnabled()
                    : Extension.wasLastColorSchemeDark;
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
        Extension.autoState = state;

        if (nextCheck) {
            if (nextCheck < Date.now()) {
                logWarn(`Alarm is set in the past: ${nextCheck}. The time is: ${new Date()}. ISO: ${(new Date()).toISOString()}`);
            } else {
                chrome.alarms.create(Extension.ALARM_NAME, {when: nextCheck});
            }
        }
    }

    public static async start() {
        Extension.init();
        await Promise.all([
            ConfigManager.load({local: true}),
            Extension.MV3syncSystemColorStateManager(null),
            UserStorage.loadSettings()
        ]);

        if (UserStorage.settings.enableContextMenus && !Extension.registeredContextMenus) {
            chrome.permissions.contains({permissions: ['contextMenus']}, (permitted) => {
                if (permitted) {
                    Extension.registerContextMenus();
                } else {
                    logWarn('User has enabled context menus, but did not provide permission.');
                }
            });
        }
        if (UserStorage.settings.syncSitesFixes) {
            await ConfigManager.load({local: false});
        }
        Extension.updateAutoState();
        Extension.onAppToggle();
        logInfo('loaded', UserStorage.settings);

        if (__THUNDERBIRD__) {
            TabManager.registerMailDisplayScript();
        } else {
            TabManager.updateContentScript({runOnProtectedPages: UserStorage.settings.enableForProtectedPages});
        }

        UserStorage.settings.fetchNews && Newsmaker.subscribe();
        Extension.startBarrier!.resolve();
    }

    private static getMessengerAdapter(): ExtensionAdapter {
        return {
            collect: async () => {
                return await Extension.collectData();
            },
            collectDevToolsData: async () => {
                return await Extension.collectDevToolsData();
            },
            changeSettings: Extension.changeSettings,
            setTheme: Extension.setTheme,
            toggleActiveTab: Extension.toggleActiveTab,
            markNewsAsRead: Newsmaker.markAsRead,
            markNewsAsDisplayed: Newsmaker.markAsDisplayed,
            loadConfig: ConfigManager.load,
            applyDevDynamicThemeFixes: DevTools.applyDynamicThemeFixes,
            resetDevDynamicThemeFixes: DevTools.resetDynamicThemeFixes,
            applyDevInversionFixes: DevTools.applyInversionFixes,
            resetDevInversionFixes: DevTools.resetInversionFixes,
            applyDevStaticThemes: DevTools.applyStaticThemes,
            resetDevStaticThemes: DevTools.resetStaticThemes,
        };
    }

    private static onCommandInternal = async (command: Command, tabId: number | null, frameId: number | null, frameURL: string | null) => {
        if (Extension.startBarrier!.isPending()) {
            await Extension.startBarrier!.entry();
        }
        Extension.stateManager!.loadState();
        switch (command) {
            case 'toggle':
                logInfo('Toggle command entered');
                Extension.changeSettings({
                    enabled: !Extension.isExtensionSwitchedOn(),
                    automation: {...UserStorage.settings.automation, ...{enable: false}},
                });
                break;
            case 'addSite': {
                logInfo('Add Site command entered');
                async function scriptPDF(tabId: number, frameId: number): Promise<boolean> {
                    // We can not detect PDF if we do not know where we are looking for it
                    if (!(Number.isInteger(tabId) && Number.isInteger(frameId))) {
                        return false;
                    }
                    function detectPDF(): boolean {
                        if (document.body.childElementCount !== 1) {
                            return false;
                        }
                        const {nodeName, type} = document.body.childNodes[0] as HTMLEmbedElement;
                        return nodeName === 'EMBED' && type === 'application/pdf';
                    }

                    if (__CHROMIUM_MV3__) {
                        return (await chrome.scripting.executeScript({
                            target: {tabId, frameIds: [frameId]},
                            func: detectPDF,
                        }))[0].result;
                    } else if (__CHROMIUM_MV2__) {
                        return new Promise<boolean>((resolve) => chrome.tabs.executeScript(tabId, {
                            frameId,
                            code: `(${detectPDF.toString()})()`
                        }, ([r]) => resolve(r)));
                    }
                    return false;
                }

                const pdf = async () => isPDF(frameURL || await TabManager.getActiveTabURL());
                if (((__CHROMIUM_MV2__ || __CHROMIUM_MV3__) && await scriptPDF(tabId!, frameId!)) || await pdf()) {
                    Extension.changeSettings({enableForPDF: !UserStorage.settings.enableForPDF});
                } else {
                    Extension.toggleActiveTab();
                }
                break;
            }
            case 'switchEngine': {
                logInfo('Switch Engine command entered');
                const engines = Object.values(ThemeEngine);
                const index = engines.indexOf(UserStorage.settings.theme.engine);
                const next = engines[(index + 1) % engines.length];
                Extension.setTheme({engine: next});
                break;
            }
        }
    };

    // 75 is small enough to not notice it, and still catches when someone
    // is holding down a certain shortcut.
    private static onCommand = debounce(75, Extension.onCommandInternal);

    private static registerContextMenus() {
        chrome.contextMenus.onClicked.addListener(async ({menuItemId, frameId, frameUrl, pageUrl}, tab) =>
            Extension.onCommand(menuItemId as Command, tab && tab.id || null, frameId || null, frameUrl || pageUrl));
        chrome.contextMenus.removeAll(() => {
            Extension.registeredContextMenus = false;
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
                Extension.registeredContextMenus = true;
            });
        });
    }

    private static async getShortcuts() {
        const commands = await getCommands();
        return commands.reduce((map, cmd) => Object.assign(map, {[cmd.name!]: cmd.shortcut}), {} as Shortcuts);
    }

    public static async collectData(): Promise<ExtensionData> {
        await Extension.loadData();
        const [
            news,
            shortcuts,
            activeTab,
            isAllowedFileSchemeAccess,
        ] = await Promise.all([
            Newsmaker.getLatest(),
            Extension.getShortcuts(),
            Extension.getActiveTabInfo(),
            new Promise<boolean>((r) => chrome.extension.isAllowedFileSchemeAccess(r)),
        ]);
        return {
            isEnabled: Extension.isExtensionSwitchedOn(),
            isReady: true,
            isAllowedFileSchemeAccess,
            settings: UserStorage.settings,
            news,
            shortcuts,
            colorScheme: ConfigManager.COLOR_SCHEMES_RAW!,
            forcedScheme: Extension.autoState === 'scheme-dark' ? 'dark' : Extension.autoState === 'scheme-light' ? 'light' : null,
            activeTab,
        };
    }

    public static async collectDevToolsData(): Promise<DevToolsData> {
        const [
            dynamicFixesText,
            filterFixesText,
            staticThemesText
        ] = await Promise.all([
            DevTools.getDynamicThemeFixesText(),
            DevTools.getInversionFixesText(),
            DevTools.getStaticThemesText(),
        ]);
        return {
            dynamicFixesText,
            filterFixesText,
            staticThemesText
        };
    }

    private static async getActiveTabInfo() {
        await Extension.loadData();
        const tabURL = await TabManager.getActiveTabURL();
        const info = Extension.getTabInfo(tabURL);
        info.isInjected = await TabManager.canAccessActiveTab();
        if (UserStorage.settings.detectDarkTheme) {
            info.isDarkThemeDetected = await TabManager.isActiveTabDarkThemeDetected();
        }
        return info;
    }

    private static async getConnectionMessage(tabURL: string, url: string, isTopFrame: boolean) {
        await Extension.loadData();
        return Extension.getTabMessage(tabURL, url, isTopFrame);
    }

    private static async loadData() {
        Extension.init();
        await Promise.all([
            Extension.stateManager!.loadState(),
            UserStorage.loadSettings(),
        ]);
    }

    private static onColorSchemeChange = async (isDark: boolean) => {
        if (Extension.wasLastColorSchemeDark === isDark) {
            // If color scheme was already correct, we do not need to do anyhting
            return;
        }
        Extension.wasLastColorSchemeDark = isDark;
        Extension.MV3syncSystemColorStateManager(isDark);
        await Extension.loadData();
        if (UserStorage.settings.automation.mode !== AutomationMode.SYSTEM) {
            return;
        }
        Extension.handleAutomationCheck();
    };

    private static handleAutomationCheck = () => {
        Extension.updateAutoState();

        const isSwitchedOn = Extension.isExtensionSwitchedOn();
        if (
            Extension.wasEnabledOnLastCheck === null ||
            Extension.wasEnabledOnLastCheck !== isSwitchedOn ||
            Extension.autoState === 'scheme-dark' ||
            Extension.autoState === 'scheme-light'
        ) {
            Extension.wasEnabledOnLastCheck = isSwitchedOn;
            Extension.onAppToggle();
            TabManager.sendMessage();
            Extension.reportChanges();
            Extension.stateManager!.saveState();
        }
    };

    public static async changeSettings($settings: Partial<UserSettings>, onlyUpdateActiveTab = false) {
        const promises = [];
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
            Extension.updateAutoState();
            Extension.onAppToggle();
        }
        if (prev.syncSettings !== UserStorage.settings.syncSettings) {
            const promise = UserStorage.saveSyncSetting(UserStorage.settings.syncSettings);
            promises.push(promise);
        }
        if (Extension.isExtensionSwitchedOn() && $settings.changeBrowserTheme != null && prev.changeBrowserTheme !== $settings.changeBrowserTheme) {
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
                Extension.registerContextMenus();
            } else {
                chrome.contextMenus.removeAll();
            }
        }
        const promise = Extension.onSettingsChanged(onlyUpdateActiveTab);
        promises.push(promise);
        await Promise.all(promises);
    }

    private static setTheme($theme: Partial<FilterConfig>) {
        UserStorage.set({theme: {...UserStorage.settings.theme, ...$theme}});

        if (Extension.isExtensionSwitchedOn() && UserStorage.settings.changeBrowserTheme) {
            setWindowTheme(UserStorage.settings.theme);
        }

        Extension.onSettingsChanged();
    }

    private static async reportChanges() {
        const info = await Extension.collectData();
        Messenger.reportChanges(info);
    }

    private static async toggleActiveTab() {
        const settings = UserStorage.settings;
        const tab = await Extension.getActiveTabInfo();
        const {url} = tab;
        const isInDarkList = ConfigManager.isURLInDarkList(url);
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
            Extension.changeSettings({siteListEnabled: toggledList}, true);
            return;
        }

        const toggledList = getToggledList(settings.siteList);
        Extension.changeSettings({siteList: toggledList}, true);
    }

    //------------------------------------
    //
    //       Handle config changes
    //

    private static onAppToggle() {
        if (Extension.isExtensionSwitchedOn()) {
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
            if (Extension.isExtensionSwitchedOn() && Extension.autoState !== 'scheme-light') {
                setWindowTheme(UserStorage.settings.theme);
            } else {
                resetWindowTheme();
            }
        }
    }

    private static async onSettingsChanged(onlyUpdateActiveTab = false) {
        await Extension.loadData();
        Extension.wasEnabledOnLastCheck = Extension.isExtensionSwitchedOn();
        TabManager.sendMessage(onlyUpdateActiveTab);
        Extension.saveUserSettings();
        Extension.reportChanges();
        Extension.stateManager!.saveState();
    }

    //----------------------
    //
    // Add/remove css to tab
    //
    //----------------------

    private static getTabInfo(tabURL: string): TabInfo {
        const isInDarkList = ConfigManager.isURLInDarkList(tabURL);
        const isProtected = !canInjectScript(tabURL);
        return {
            url: tabURL,
            isInDarkList,
            isProtected,
            isInjected: null,
            isDarkThemeDetected: null,
        };
    }

    private static getTabMessage = (tabURl: string, url: string, isTopFrame: boolean): TabData => {
        const settings = UserStorage.settings;
        const tabInfo = Extension.getTabInfo(tabURl);
        if (Extension.isExtensionSwitchedOn() && isURLEnabled(tabURl, settings, tabInfo)) {
            const custom = settings.customThemes.find(({url: urlList}) => isURLInList(tabURl, urlList));
            const preset = custom ? null : settings.presets.find(({urls}) => isURLInList(tabURl, urls));
            let theme = custom ? custom.theme : preset ? preset.theme : settings.theme;
            if (Extension.autoState === 'scheme-dark' || Extension.autoState === 'scheme-light') {
                const mode = Extension.autoState === 'scheme-dark' ? 1 : 0;
                theme = {...theme, mode};
            }
            const detectDarkTheme = isTopFrame && settings.detectDarkTheme && !isURLInList(tabURl, settings.siteListEnabled) && !isPDF(tabURl);

            logInfo(`Creating CSS for url: ${url}`);
            logInfo(`Custom theme ${custom ? 'was found' : 'was not found'}, Preset theme ${preset ? 'was found' : 'was not found'}
            The theme(${custom ? 'custom' : preset ? 'preset' : 'global'} settings) used is: ${JSON.stringify(theme)}`);
            switch (theme.engine) {
                case ThemeEngine.cssFilter: {
                    return {
                        type: MessageType.BG_ADD_CSS_FILTER,
                        data: {
                            css: createCSSFilterStylesheet(theme, url, isTopFrame, ConfigManager.INVERSION_FIXES_RAW!, ConfigManager.INVERSION_FIXES_INDEX!),
                            detectDarkTheme,
                        },
                    };
                }
                case ThemeEngine.svgFilter: {
                    if (isFirefox) {
                        return {
                            type: MessageType.BG_ADD_CSS_FILTER,
                            data: {
                                css: createSVGFilterStylesheet(theme, url, isTopFrame, ConfigManager.INVERSION_FIXES_RAW!, ConfigManager.INVERSION_FIXES_INDEX!),
                                detectDarkTheme,
                            },
                        };
                    }
                    return {
                        type: MessageType.BG_ADD_SVG_FILTER,
                        data: {
                            css: createSVGFilterStylesheet(theme, url, isTopFrame, ConfigManager.INVERSION_FIXES_RAW!, ConfigManager.INVERSION_FIXES_INDEX!),
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
                                createStaticStylesheet(theme, url, isTopFrame, ConfigManager.STATIC_THEMES_RAW!, ConfigManager.STATIC_THEMES_INDEX!),
                            detectDarkTheme: settings.detectDarkTheme,
                        },
                    };
                }
                case ThemeEngine.dynamicTheme: {
                    const fixes = getDynamicThemeFixesFor(url, isTopFrame, ConfigManager.DYNAMIC_THEME_FIXES_RAW!, ConfigManager.DYNAMIC_THEME_FIXES_INDEX!, UserStorage.settings.enableForPDF);
                    return {
                        type: MessageType.BG_ADD_DYNAMIC_THEME,
                        data: {
                            theme,
                            fixes,
                            isIFrame: !isTopFrame,
                            detectDarkTheme,
                        },
                    };
                }
                default:
                    throw new Error(`Unknown engine ${theme.engine}`);
            }
        }

        logInfo(`Site is not inverted: ${tabURl}`);
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
