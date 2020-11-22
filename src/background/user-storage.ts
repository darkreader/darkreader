import {DEFAULT_SETTINGS, DEFAULT_THEME} from '../defaults';
import {debounce} from '../utils/debounce';
import {isURLMatched} from '../utils/url';
import type {UserSettings} from '../definitions';
import {readSyncStorage, readLocalStorage, writeSyncStorage, writeLocalStorage, subscribeToOuterSettingsChange} from './utils/extension-api';

const SAVE_TIMEOUT = 1000;

interface UserStorageOptions {
    onRemoteSettingsChange: () => any;
}

export default class UserStorage {
    constructor({onRemoteSettingsChange}: UserStorageOptions) {
        this.settings = null;
        subscribeToOuterSettingsChange(async () => {
            await this.loadSettings();
            onRemoteSettingsChange();
        });
    }

    settings: Readonly<UserSettings>;

    async loadSettings() {
        this.settings = await this.loadSettingsFromStorage();
    }

    private fillDefaults(settings: UserSettings) {
        settings.theme = {...DEFAULT_THEME, ...settings.theme};
        settings.time = {...DEFAULT_SETTINGS.time, ...settings.time};
        settings.presets.forEach((preset) => {
            preset.theme = {...DEFAULT_THEME, ...preset.theme};
        });
        settings.customThemes.forEach((site) => {
            site.theme = {...DEFAULT_THEME, ...site.theme};
        });
    }

    private async loadSettingsFromStorage() {
        const local = await readLocalStorage(DEFAULT_SETTINGS);
        if (local.syncSettings == null) {
            local.syncSettings = DEFAULT_SETTINGS.syncSettings;
        }
        if (!local.syncSettings) {
            this.fillDefaults(local);
            return local;
        }

        const $sync = await readSyncStorage(DEFAULT_SETTINGS);
        if (!$sync) {
            console.warn('Sync settings are missing');
            local.syncSettings = false;
            this.set({syncSettings: false});
            this.saveSyncSetting(false);
            return local;
        }

        const sync = await readSyncStorage(DEFAULT_SETTINGS);
        this.fillDefaults(sync);
        return sync;
    }

    async saveSettings() {
        await this.saveSettingsIntoStorage();
    }

    async saveSyncSetting(sync: boolean) {
        const obj = {syncSettings: sync};
        await writeLocalStorage(obj);
        try {
            await writeSyncStorage(obj);
        } catch (err) {
            console.warn('Settings synchronization was disabled due to error:', chrome.runtime.lastError);
            this.set({syncSettings: false});
        }
    }

    private saveSettingsIntoStorage = debounce(SAVE_TIMEOUT, async () => {
        const settings = this.settings;
        if (settings.syncSettings) {
            try {
                await writeSyncStorage(settings);
            } catch (err) {
                console.warn('Settings synchronization was disabled due to error:', chrome.runtime.lastError);
                this.set({syncSettings: false});
                await this.saveSyncSetting(false);
                await writeLocalStorage(settings);
            }
        } else {
            await writeLocalStorage(settings);
        }
    });

    set($settings: Partial<UserSettings>) {
        if ($settings.siteList) {
            if (!Array.isArray($settings.siteList)) {
                const list = [];
                for (const key in ($settings.siteList as any)) {
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
                    console.warn(`Pattern "${pattern}" excluded`);
                }
                return isOK && pattern !== '/';
            });
            $settings = {...$settings, siteList};
        }
        this.settings = {...this.settings, ...$settings};
    }
}
