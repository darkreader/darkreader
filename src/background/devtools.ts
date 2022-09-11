import {logInfo, logWarn} from './utils/log';
import {parseInversionFixes, formatInversionFixes} from '../generators/css-filter';
import {parseDynamicThemeFixes, formatDynamicThemeFixes} from '../generators/dynamic-theme';
import {parseStaticThemes, formatStaticThemes} from '../generators/static-theme';
import ConfigManager from './config-manager';
import {isFirefox} from '../utils/platform';

// TODO(bershanskiy): Add support for reads/writes of multiple keys at once for performance.
// TODO(bershanskiy): Popup UI heeds only hasCustom*Fixes() and nothing else. Consider storing that data separatelly.
interface DevToolsStorage {
    get(key: string): Promise<string>;
    set(key: string, value: string): Promise<void> | void;
    remove(key: string): Promise<void> | void;
    has(key: string): Promise<boolean> | boolean;
    setDataIsMigratedForTesting(value: boolean): void;
}

declare const __DEBUG__: boolean;

class PersistentStorageWrapper implements DevToolsStorage {
    // Cache information within background context for future use without waiting.
    private cache: {[key: string]: string} = {};

    // TODO(bershanskiy): remove migrated and migrateFromLocalStorage after migration end.
    // Part 1 of 2.
    private dataIsMigrated = false;

    setDataIsMigratedForTesting(value: boolean) {
        if (__DEBUG__) {
            this.dataIsMigrated = value;
        }
    }

    // This function moves DevTools data from loclStorage to chrome.storage.local.
    // This function is run on every backgroun context invocation, but it has effect only on the
    // first run.
    private async migrateFromLocalStorage() {
        // In MV3 world we can't access localStorage, so we can not migrate anything.
        // Bail out and consider data migrated.
        if (typeof localStorage === 'undefined') {
            this.dataIsMigrated = true;
            return;
        }

        return new Promise<void>((resolve) => {
            chrome.storage.local.get([
                DevTools.KEY_DYNAMIC,
                DevTools.KEY_FILTER,
                DevTools.KEY_STATIC
            ], (data) => {
                if (chrome.runtime.lastError) {
                    console.error('DevTools failed to migrate data', chrome.runtime.lastError);
                    resolve();
                }
                // If storage contains at least one relevant record, we consider data migrated.
                if (data[DevTools.KEY_DYNAMIC] || data[DevTools.KEY_FILTER] || data[DevTools.KEY_STATIC]) {
                    this.dataIsMigrated = true;
                    this.cache = data;
                    resolve();
                    return;
                }

                this.cache = {
                    [DevTools.KEY_DYNAMIC]: localStorage.getItem(DevTools.KEY_DYNAMIC),
                    [DevTools.KEY_FILTER]: localStorage.getItem(DevTools.KEY_FILTER),
                    [DevTools.KEY_STATIC]: localStorage.getItem(DevTools.KEY_STATIC),
                };

                chrome.storage.local.set(this.cache, () => {
                    if (chrome.runtime.lastError) {
                        console.error('DevTools failed to migrate data', chrome.runtime.lastError);
                        resolve();
                    }
                    this.dataIsMigrated = true;
                    // Clean up localStorage after migration
                    localStorage.removeItem(DevTools.KEY_DYNAMIC);
                    localStorage.removeItem(DevTools.KEY_FILTER);
                    localStorage.removeItem(DevTools.KEY_STATIC);
                    resolve();
                });
            });
        });
    }

    async get(key: string) {
        if (!this.dataIsMigrated) {
            await this.migrateFromLocalStorage();
        }

        if (key in this.cache) {
            return this.cache[key];
        }
        return new Promise<string>((resolve) => {
            chrome.storage.local.get(key, (result) => {
                // If cache received a new value (from call to set())
                // before we retreived the old value from storage,
                // return the new value.
                if (key in this.cache) {
                    logInfo(`Key ${key} was written to during read operation.`);
                    resolve(this.cache[key]);
                    return;
                }

                if (chrome.runtime.lastError) {
                    console.error('Failed to query DevTools data', chrome.runtime.lastError);
                    resolve(null);
                    return;
                }

                this.cache[key] = result[key];
                resolve(result[key]);
            });
        });
    }

    async set(key: string, value: string) {
        this.cache[key] = value;
        return new Promise<void>((resolve) => chrome.storage.local.set({[key]: value}, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to write DevTools data', chrome.runtime.lastError);
            } else {
                resolve();
            }
        }));
    }

    async remove(key: string) {
        this.cache[key] = undefined;
        return new Promise<void>((resolve) => chrome.storage.local.remove(key, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to delete DevTools data', chrome.runtime.lastError);
            } else {
                resolve();
            }
        }));
    }

    async has(key: string) {
        return Boolean(await this.get(key));
    }
}

class LocalStorageWrapper implements DevToolsStorage {
    setDataIsMigratedForTesting() {
        if (__DEBUG__) {
            logWarn('Unexpected call to setDataIsMigratedForTesting');
        }
    }

    async get(key: string) {
        try {
            return localStorage.getItem(key);
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    set(key: string, value: string) {
        try {
            localStorage.setItem(key, value);
        } catch (err) {
            console.error(err);
        }
    }

    remove(key: string) {
        try {
            localStorage.removeItem(key);
        } catch (err) {
            console.error(err);
        }
    }

    async has(key: string) {
        try {
            return localStorage.getItem(key) != null;
        } catch (err) {
            console.error(err);
            return false;
        }
    }
}

class TempStorage implements DevToolsStorage {
    setDataIsMigratedForTesting() {
        if (__DEBUG__) {
            logWarn('Unexpected call to setDataIsMigratedForTesting');
        }
    }

    map = new Map<string, string>();

    async get(key: string) {
        return this.map.get(key);
    }

    set(key: string, value: string) {
        this.map.set(key, value);
    }

    remove(key: string) {
        this.map.delete(key);
    }

    async has(key: string) {
        return this.map.has(key);
    }
}

export default class DevTools {
    private static onChange: () => void;
    private static store: DevToolsStorage;

    static init(onChange: () => void) {
        // Firefox don't seem to like using storage.local to store big data on the background-extension.
        // Disabling it for now and defaulting back to localStorage.
        if (typeof chrome.storage.local !== 'undefined' && chrome.storage.local !== null && !isFirefox) {
            this.store = new PersistentStorageWrapper();
        } else if (typeof localStorage !== 'undefined' && localStorage != null) {
            this.store = new LocalStorageWrapper();
        } else {
            this.store = new TempStorage();
        }
        this.loadConfigOverrides();
        this.onChange = onChange;
    }

    // TODO(bershanskiy): make private again once PersistentStorageWrapper removes migration logic.
    // Part 2 of 2.
    static KEY_DYNAMIC = 'dev_dynamic_theme_fixes';
    static KEY_FILTER = 'dev_inversion_fixes';
    static KEY_STATIC = 'dev_static_themes';

    static setDataIsMigratedForTesting(value: boolean) {
        this.store.setDataIsMigratedForTesting(value);
    }

    private static async loadConfigOverrides() {
        const [
            dynamicThemeFixes,
            inversionFixes,
            staticThemes
        ] = await Promise.all([
            this.getSavedDynamicThemeFixes(),
            this.getSavedInversionFixes(),
            this.getSavedStaticThemes(),
        ]);
        ConfigManager.overrides.dynamicThemeFixes = dynamicThemeFixes || null;
        ConfigManager.overrides.inversionFixes = inversionFixes || null;
        ConfigManager.overrides.staticThemes = staticThemes || null;
    }

    private static async getSavedDynamicThemeFixes() {
        return this.store.get(DevTools.KEY_DYNAMIC);
    }

    private static saveDynamicThemeFixes(text: string) {
        this.store.set(DevTools.KEY_DYNAMIC, text);
    }

    static async getDynamicThemeFixesText() {
        const $fixes = await this.getSavedDynamicThemeFixes();
        const fixes = $fixes ? parseDynamicThemeFixes($fixes) : parseDynamicThemeFixes(ConfigManager.DYNAMIC_THEME_FIXES_RAW);
        return formatDynamicThemeFixes(fixes);
    }

    static resetDynamicThemeFixes() {
        this.store.remove(DevTools.KEY_DYNAMIC);
        ConfigManager.overrides.dynamicThemeFixes = null;
        ConfigManager.handleDynamicThemeFixes();
        this.onChange();
    }

    static applyDynamicThemeFixes(text: string) {
        try {
            const formatted = formatDynamicThemeFixes(parseDynamicThemeFixes(text));
            ConfigManager.overrides.dynamicThemeFixes = formatted;
            ConfigManager.handleDynamicThemeFixes();
            this.saveDynamicThemeFixes(formatted);
            this.onChange();
            return null;
        } catch (err) {
            return err;
        }
    }

    private static async getSavedInversionFixes() {
        return this.store.get(DevTools.KEY_FILTER);
    }

    private static saveInversionFixes(text: string) {
        this.store.set(DevTools.KEY_FILTER, text);
    }

    static async getInversionFixesText() {
        const $fixes = await this.getSavedInversionFixes();
        const fixes = $fixes ? parseInversionFixes($fixes) : parseInversionFixes(ConfigManager.INVERSION_FIXES_RAW);
        return formatInversionFixes(fixes);
    }

    static resetInversionFixes() {
        this.store.remove(DevTools.KEY_FILTER);
        ConfigManager.overrides.inversionFixes = null;
        ConfigManager.handleInversionFixes();
        this.onChange();
    }

    static applyInversionFixes(text: string) {
        try {
            const formatted = formatInversionFixes(parseInversionFixes(text));
            ConfigManager.overrides.inversionFixes = formatted;
            ConfigManager.handleInversionFixes();
            this.saveInversionFixes(formatted);
            this.onChange();
            return null;
        } catch (err) {
            return err;
        }
    }

    private static async getSavedStaticThemes() {
        return this.store.get(DevTools.KEY_STATIC);
    }

    private static saveStaticThemes(text: string) {
        this.store.set(DevTools.KEY_STATIC, text);
    }

    static async getStaticThemesText() {
        const $themes = await this.getSavedStaticThemes();
        const themes = $themes ? parseStaticThemes($themes) : parseStaticThemes(ConfigManager.STATIC_THEMES_RAW);
        return formatStaticThemes(themes);
    }

    static resetStaticThemes() {
        this.store.remove(DevTools.KEY_STATIC);
        ConfigManager.overrides.staticThemes = null;
        ConfigManager.handleStaticThemes();
        this.onChange();
    }

    static applyStaticThemes(text: string) {
        try {
            const formatted = formatStaticThemes(parseStaticThemes(text));
            ConfigManager.overrides.staticThemes = formatted;
            ConfigManager.handleStaticThemes();
            this.saveStaticThemes(formatted);
            this.onChange();
            return null;
        } catch (err) {
            return err;
        }
    }
}
