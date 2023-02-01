import {DEFAULT_SETTINGS, DEFAULT_THEME} from '../defaults';
import {debounce} from '../utils/debounce';
import {isURLMatched} from '../utils/url';
import type {UserSettings} from '../definitions';
import {readSyncStorage, readLocalStorage, writeSyncStorage, writeLocalStorage} from './utils/extension-api';
import {logWarn} from './utils/log';
import {PromiseBarrier} from '../utils/promise-barrier';
import {validateSettings} from '../utils/validation';

const SAVE_TIMEOUT = 1000;

export default class UserStorage {
    private static loadBarrier: PromiseBarrier<UserSettings, void>;
    private static saveStorageBarrier: PromiseBarrier<void, void> | null;
    public static settings: Readonly<UserSettings>;

    public static async loadSettings() {
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
    }

    // migrateAutomationSettings migrates old automation settings to the new interface.
    // It will move settings.automation & settings.automationBehavior into,
    // settings.automation = { enabled, mode, behavior }.
    // Remove this over two years(mid-2024).
    // This won't always work, because browsers can decide to instead use the default settings
    // when they notice a different type being requested for automation, in that case it's a data-loss
    // and not something we can encouter for, except for doing always two extra requests to explicitly
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

    private static async loadSettingsFromStorage(): Promise<UserSettings> {
        if (UserStorage.loadBarrier) {
            return await UserStorage.loadBarrier.entry();
        }
        UserStorage.loadBarrier = new PromiseBarrier();

        const local = await readLocalStorage(DEFAULT_SETTINGS);
        const {errors: localCfgErrors} = validateSettings(local);
        localCfgErrors.forEach((err) => logWarn(err));
        if (local.syncSettings == null) {
            local.syncSettings = DEFAULT_SETTINGS.syncSettings;
        }
        if (!local.syncSettings) {
            UserStorage.migrateAutomationSettings(local);
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
        UserStorage.fillDefaults($sync);

        UserStorage.loadBarrier.resolve($sync);
        return $sync;
    }

    public static async saveSettings() {
        if (!UserStorage.settings) {
            // This path is never taken because Extension always calls UserStorage.loadSettings()
            // before calling UserStorage.saveSettings().
            logWarn('Could not save setthings into storage because settings are missing.');
            return;
        }
        await UserStorage.saveSettingsIntoStorage();
    }

    public static async saveSyncSetting(sync: boolean) {
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

    public static set($settings: Partial<UserSettings>) {
        if (!UserStorage.settings) {
            // This path is never taken because Extension always calls UserStorage.loadSettings()
            // before calling UserStorage.set().
            logWarn('Could not modify setthings because settings are missing.');
            return;
        }
        if ($settings.siteList) {
            if (!Array.isArray($settings.siteList)) {
                const list: string[] = [];
                for (const key in ($settings.siteList as string[])) {
                    const index = Number(key);
                    if (!isNaN(index)) {
                        list[index] = $settings.siteList[key];
                    }
                }
                $settings.siteList = list;
            }
            const siteList = $settings.siteList.filter((pattern) => {
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
            $settings = {...$settings, siteList};
        }
        UserStorage.settings = {...UserStorage.settings, ...$settings};
    }
}
