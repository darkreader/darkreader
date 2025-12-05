import {ThemeEngine} from '../generators/theme-engines';
import {DEFAULT_SETTINGS, DEFAULT_THEME} from '../defaults';
import type {UserSettings} from '../definitions';
import {debounce} from '../utils/debounce';
import {PromiseBarrier} from '../utils/promise-barrier';
import {isURLMatched} from '../utils/url';
import {validateSettings} from '../utils/validation';

import {readSyncStorage, readLocalStorage, writeSyncStorage, writeLocalStorage, removeSyncStorage, removeLocalStorage} from './utils/extension-api';
import {logWarn} from './utils/log';


const SAVE_TIMEOUT = 1000;

export default class UserStorage {
    private static loadBarrier: PromiseBarrier<UserSettings, void>;
    private static saveStorageBarrier: PromiseBarrier<void, void> | null;
    static settings: Readonly<UserSettings>;

    static async loadSettings(): Promise<void> {
        if (!UserStorage.settings) {
            UserStorage.settings = await UserStorage.loadSettingsFromStorage();
        }
    }

    private static fillDefaults(settings: UserSettings) {
        settings.theme = {...DEFAULT_THEME, ...settings.theme};
        settings.time = {...DEFAULT_SETTINGS.time, ...settings.time};
        settings.presets.forEach((preset) => {
            preset.theme = {...DEFAULT_THEME, ...preset.theme};
        });
        settings.customThemes.forEach((site) => {
            site.theme = {...DEFAULT_THEME, ...site.theme};
        });
        if (settings.customThemes.length === 0) {
            settings.customThemes = DEFAULT_SETTINGS.customThemes;
        }
    }

    // migrateAutomationSettings migrates old automation settings to the new interface.
    // It will move settings.automation & settings.automationBehavior into,
    // settings.automation = { enabled, mode, behavior }.
    // Remove this over two years(mid-2024).
    // This won't always work, because browsers can decide to instead use the default settings
    // when they notice a different type being requested for automation, in that case it's a data-loss
    // and not something we can encounter for, except for doing always two extra requests to explicitly
    // check for this case which is inefficient usage of requesting storage.
    private static migrateAutomationSettings(settings: UserSettings): void {
        if (typeof settings.automation === 'string') {
            const automationMode = settings.automation;
            const automationBehavior: UserSettings['automation']['behavior'] = (settings as any).automationBehaviour;
            if (settings.automation === '') {
                settings.automation = {
                    enabled: false,
                    mode: automationMode,
                    behavior: automationBehavior,
                };
            } else {
                settings.automation = {
                    enabled: true,
                    mode: automationMode,
                    behavior: automationBehavior,
                };
            }
            delete (settings as any).automationBehaviour;
        }
    }

    private static migrateSiteListsV2(deprecated: any): Partial<UserSettings> {
        const settings: Partial<UserSettings> = {};
        settings.enabledByDefault = !deprecated.applyToListedOnly;
        if (settings.enabledByDefault) {
            settings.disabledFor = deprecated.siteList ?? [];
            settings.enabledFor = deprecated.siteListEnabled ?? [];
        } else {
            settings.disabledFor = [];
            settings.enabledFor = deprecated.siteList ?? [];
        }
        return settings;
    }

    private static migrateBuiltInSVGFilterToCSSFilter(settings: UserSettings): void {
        settings?.customThemes?.forEach((c) => {
            if (
                c?.theme?.engine === ThemeEngine.svgFilter &&
                (c.builtIn || c.url?.includes('docs.google.com'))
            ) {
                c.theme.engine = ThemeEngine.cssFilter;
            }
        });
    }

    private static async loadSettingsFromStorage(): Promise<UserSettings> {
        if (UserStorage.loadBarrier) {
            return await UserStorage.loadBarrier.entry();
        }
        UserStorage.loadBarrier = new PromiseBarrier();

        let local = await readLocalStorage(DEFAULT_SETTINGS);

        if (local.schemeVersion < 2) {
            const sync = await readSyncStorage({schemeVersion: 0});
            if (!sync || sync.schemeVersion < 2) {
                const deprecatedDefaults = {
                    siteList: [],
                    siteListEnabled: [],
                    applyToListedOnly: false,
                };
                const localDeprecated = await readLocalStorage(deprecatedDefaults);
                const localTransformed = UserStorage.migrateSiteListsV2(localDeprecated);
                await writeLocalStorage({schemeVersion: 2, ...localTransformed});
                await removeLocalStorage(Object.keys(deprecatedDefaults));

                const syncDeprecated = await readSyncStorage(deprecatedDefaults);
                const syncTransformed = UserStorage.migrateSiteListsV2(syncDeprecated);
                await writeSyncStorage({schemeVersion: 2, ...syncTransformed});
                await removeSyncStorage(Object.keys(deprecatedDefaults));

                local = await readLocalStorage(DEFAULT_SETTINGS);
            }
        }

        const {errors: localCfgErrors} = validateSettings(local);
        localCfgErrors.forEach((err) => logWarn(err));
        if (local.syncSettings == null) {
            local.syncSettings = DEFAULT_SETTINGS.syncSettings;
        }
        if (!local.syncSettings) {
            UserStorage.migrateAutomationSettings(local);
            UserStorage.migrateBuiltInSVGFilterToCSSFilter(local);
            UserStorage.fillDefaults(local);
            UserStorage.loadBarrier.resolve(local);
            return local;
        }

        const $sync = await readSyncStorage(DEFAULT_SETTINGS);
        if (!$sync) {
            logWarn('Sync settings are missing');
            local.syncSettings = false;
            UserStorage.set({syncSettings: false});
            UserStorage.saveSyncSetting(false);
            UserStorage.loadBarrier.resolve(local);
            return local;
        }

        const {errors: syncCfgErrors} = validateSettings($sync);
        syncCfgErrors.forEach((err) => logWarn(err));

        UserStorage.migrateAutomationSettings($sync);
        UserStorage.migrateBuiltInSVGFilterToCSSFilter($sync);
        UserStorage.fillDefaults($sync);

        UserStorage.loadBarrier.resolve($sync);
        return $sync;
    }

    static async saveSettings(): Promise<void> {
        if (!UserStorage.settings) {
            // This path is never taken because Extension always calls UserStorage.loadSettings()
            // before calling UserStorage.saveSettings().
            logWarn('Could not save settings into storage because the settings are missing.');
            return;
        }
        await UserStorage.saveSettingsIntoStorage();
    }

    static async saveSyncSetting(sync: boolean): Promise<void> {
        const obj = {syncSettings: sync};
        await writeLocalStorage(obj);
        try {
            await writeSyncStorage(obj);
        } catch (err) {
            logWarn('Settings synchronization was disabled due to error:', chrome.runtime.lastError);
            UserStorage.set({syncSettings: false});
        }
    }

    private static saveSettingsIntoStorage = debounce(SAVE_TIMEOUT, async () => {
        if (UserStorage.saveStorageBarrier) {
            await UserStorage.saveStorageBarrier.entry();
            return;
        }
        UserStorage.saveStorageBarrier = new PromiseBarrier();

        const settings = UserStorage.settings;
        if (settings.syncSettings) {
            try {
                await writeSyncStorage(settings);
            } catch (err) {
                logWarn('Settings synchronization was disabled due to error:', chrome.runtime.lastError);
                UserStorage.set({syncSettings: false});
                await UserStorage.saveSyncSetting(false);
                await writeLocalStorage(settings);
            }
        } else {
            await writeLocalStorage(settings);
        }

        UserStorage.saveStorageBarrier.resolve();
        UserStorage.saveStorageBarrier = null;
    });

    static set($settings: Partial<UserSettings>): void {
        if (!UserStorage.settings) {
            // This path is never taken because Extension always calls UserStorage.loadSettings()
            // before calling UserStorage.set().
            logWarn('Could not modify settings because the settings are missing.');
            return;
        }

        const filterSiteList = (siteList: string[]) => {
            if (!Array.isArray(siteList)) {
                const list: string[] = [];
                for (const key in (siteList as string[])) {
                    const index = Number(key);
                    if (!isNaN(index)) {
                        list[index] = siteList[key];
                    }
                }
                siteList = list;
            }
            return siteList.filter((pattern) => {
                let isOK = false;
                try {
                    isURLMatched('https://google.com/', pattern);
                    isURLMatched('[::1]:1337', pattern);
                    isOK = true;
                } catch (err) {
                    logWarn(`Pattern "${pattern}" excluded`);
                }
                return isOK && pattern !== '/';
            });
        };

        const {enabledFor, disabledFor} = $settings;
        const updatedSettings = {...UserStorage.settings, ...$settings};
        if (enabledFor) {
            updatedSettings.enabledFor = filterSiteList(enabledFor);
        }
        if (disabledFor) {
            updatedSettings.disabledFor = filterSiteList(disabledFor);
        }

        UserStorage.settings = updatedSettings;
    }
}
