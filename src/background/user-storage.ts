import {configStore} from './config-manager';
import {UserSettings} from '../definitions';

const DEFAULT_SETTINGS = {
    enabled: true,
    config: {...configStore.DEFAULT_FILTER_CONFIG},
};
const SAVE_TIMEOUT = 1000;

export default class UserStorage {
    loadSettings() {
        return new Promise<UserSettings>((resolve) => {
            chrome.storage.sync.get(DEFAULT_SETTINGS, ($s: UserSettings) => {
                $s.config = {...DEFAULT_SETTINGS.config, ...$s.config};
                if (!Array.isArray($s.config.siteList)) {
                    const arr = [];
                    for (let key in $s.config.siteList) {
                        arr[key] = $s.config.siteList[key];
                    }
                    $s.config.siteList = arr;
                }
                resolve({
                    enabled: $s.enabled,
                    config: $s.config,
                } as UserSettings);
            });
        });
    }

    saveSetting(settings: UserSettings) {
        if (this.timeout) {
            clearInterval(this.timeout);
        }
        return new Promise((resolve) => {
            this.timeout = setTimeout(() => {
                const $s: UserSettings = {
                    enabled: settings.enabled,
                    config: settings.config,
                };
                chrome.storage.sync.set($s, () => {
                    this.timeout = null;
                    resolve($s);
                });
            }, SAVE_TIMEOUT);
        });
    }

    private timeout: number = null;
}
