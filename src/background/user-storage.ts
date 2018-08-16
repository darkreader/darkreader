import {isMacOS, isWindows} from '../utils/platform';
import ThemeEngines from '../generators/theme-engines';
import {isURLMatched} from '../utils/url';
import {UserSettings} from '../definitions';

const SAVE_TIMEOUT = 1000;

export default class UserStorage {
    private defaultSettings: UserSettings;

    constructor() {
        this.defaultSettings = {
            enabled: true,
            theme: {
                mode: 1,
                brightness: 100,
                contrast: 90,
                grayscale: 0,
                sepia: 10,
                useFont: false,
                fontFamily: isMacOS() ? 'Helvetica Neue' : isWindows() ? 'Segoe UI' : 'Open Sans',
                textStroke: 0,
                engine: ThemeEngines.dynamicTheme,
                stylesheet: '',
            },
            customThemes: [],
            siteList: [],
            applyToListedOnly: false,
            changeBrowserTheme: false,
            activationTime: '18:00',
            deactivationTime: '9:00',
            notifyOfNews: false,
            syncSettings: true,
        };
        this.settings = null;
    }

    settings: Readonly<UserSettings>;

    async loadSettings() {
        this.settings = await this.loadSettingsFromStorage();
    }

    private loadSettingsFromStorage() {
        return new Promise<UserSettings>((resolve) => {
            chrome.storage.local.get(this.defaultSettings, (local: UserSettings) => {
                if (!local.syncSettings) {
                    local.theme = {...this.defaultSettings.theme, ...local.theme};
                    resolve(local);
                    return;
                }

                chrome.storage.sync.get({...this.defaultSettings, config: 'empty'}, ($sync: UserSettings & {config: any}) => {
                    let sync: UserSettings;
                    if ($sync.config === 'empty') {
                        delete $sync.config;
                        sync = $sync;
                    } else {
                        sync = this.migrateSettings_4_6_2($sync) as UserSettings;
                    }
                    sync.theme = {...this.defaultSettings.theme, ...sync.theme};
                    resolve(sync);
                });
            });
        });
    }

    async saveSettings() {
        const saved = await this.saveSettingsIntoStorage(this.settings);
        this.settings = saved;
    }

    private saveSettingsIntoStorage(settings: UserSettings) {
        if (this.timeout) {
            clearInterval(this.timeout);
        }
        return new Promise<UserSettings>((resolve) => {
            this.timeout = setTimeout(() => {
                this.timeout = null;
                if (settings.syncSettings) {
                    chrome.storage.sync.set(settings, () => {
                        if (chrome.runtime.lastError) {
                            console.warn('Settings synchronization was disabled due to error:', chrome.runtime.lastError);
                            const local: UserSettings = {...settings, syncSettings: false};
                            chrome.storage.local.set(local, () => resolve(local));
                        } else {
                            resolve(settings);
                        }
                    });
                } else {
                    chrome.storage.local.set(settings, () => resolve(settings));
                }
            }, SAVE_TIMEOUT);
        });
    }

    private timeout: number = null;

    set($settings: Partial<UserSettings>) {
        if ($settings.siteList) {
            const siteList = $settings.siteList.filter((pattern) => {
                let isOK = false;
                try {
                    isURLMatched('https://google.com/', pattern);
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

    private migrateSettings_4_6_2(settings_4_6_2: any) {
        function migrateTheme(filterConfig_4_6_2: any) {
            const f = filterConfig_4_6_2;
            return {
                mode: f.mode,
                brightness: f.brightness,
                contrast: f.contrast,
                grayscale: f.grayscale,
                sepia: f.sepia,
                useFont: f.useFont,
                fontFamily: f.fontFamily,
                textStroke: f.textStroke,
                engine: f.engine,
                stylesheet: f.stylesheet,
            };
        }

        try {
            const s = settings_4_6_2;
            const settings: UserSettings = {
                enabled: s.enabled,
                ...this.defaultSettings,
                theme: migrateTheme(s.config),
                customThemes: s.config.custom ? s.config.custom.map((c) => {
                    return {
                        url: c.url,
                        theme: migrateTheme(c.config),
                    };
                }) : [],
                siteList: s.config.siteList,
                applyToListedOnly: s.config.invertListed,
                changeBrowserTheme: s.config.changeBrowserTheme,
            };
            chrome.storage.sync.remove('config');
            chrome.storage.sync.set(settings);
            return settings;
        } catch (err) {
            console.error('Settings migration error:', err, 'Loaded settings:', settings_4_6_2);
            return this.defaultSettings;
        }
    }
}
