// @ts-check
import {logInfo, logWarn} from '../utils/log';
import {parseInversionFixes, formatInversionFixes} from '../generators/css-filter';
import {parseDynamicThemeFixes, formatDynamicThemeFixes} from '../generators/dynamic-theme';
import {parseStaticThemes, formatStaticThemes} from '../generators/static-theme';
import {isFirefox} from '../utils/platform';

/** @typedef {import('./config-manager').default} ConfigManager */

// TODO(bershanskiy): Add support for reads/writes of multiple keys at once for performance.
// TODO(bershanskiy): Popup UI heeds only hasCustom*Fixes() and nothing else. Consider storing that data separatelly.
/** @typedef {{get(key: string): Promise<string>; set(key: string, value: string): void; remove(key: string): void; has(key: string): Promise<boolean>; setDataIsMigratedForTesting(value: boolean): void}} DevToolsStorage */

/**
 * @implements {DevToolsStorage}
 */
class PersistentStorageWrapper {
    // Cache information within background context for future use without waiting.
    /** @type {{[key: string]: string}} */
    #cache = {};

    // TODO(bershanskiy): remove migrated and migrateFromLocalStorage after migration end.
    // Part 1 of 2.
    #dataIsMigrated = false;

    setDataIsMigratedForTesting(/** @type {boolean} */value) {
        if (__DEBUG__) {
            this.#dataIsMigrated = value;
        }
    }

    // This function moves DevTools data from loclStorage to chrome.storage.local.
    // This function is run on every backgroun context invocation, but it has effect only on the
    // first run.
    async #migrateFromLocalStorage() {
        // In MV3 world we can't access localStorage, so we can not migrate anything.
        // Bail out and consider data migrated.
        if (typeof localStorage === 'undefined') {
            this.#dataIsMigrated = true;
            return;
        }

        return new Promise((resolve) => {
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
                    this.#dataIsMigrated = true;
                    this.cache = data;
                    resolve();
                    return;
                }

                this.cache = {
                    [DevTools.KEY_DYNAMIC]: localStorage.getItem(DevTools.KEY_DYNAMIC),
                    [DevTools.KEY_FILTER]: localStorage.getItem(DevTools.KEY_FILTER),
                    [DevTools.KEY_STATIC]: localStorage.getItem(DevTools.KEY_STATIC),
                };

                chrome.storage.local.set(this.#cache, () => {
                    if (chrome.runtime.lastError) {
                        console.error('DevTools failed to migrate data', chrome.runtime.lastError);
                        resolve();
                    }
                    this.#dataIsMigrated = true;
                    // Clean up localStorage after migration
                    localStorage.removeItem(DevTools.KEY_DYNAMIC);
                    localStorage.removeItem(DevTools.KEY_FILTER);
                    localStorage.removeItem(DevTools.KEY_STATIC);
                    resolve();
                });
            });
        });
    }

    /**
     * @param {string} key
     * @returns {Promise<string>}
     */
    async get(key) {
        if (!this.#dataIsMigrated) {
            await this.#migrateFromLocalStorage();
        }

        if (key in this.#cache) {
            return this.#cache[key];
        }
        return new Promise((resolve) => {
            chrome.storage.local.get(key, (result) => {
                // If cache received a new value (from call to set())
                // before we retreived the old value from storage,
                // return the new value.
                if (key in this.#cache) {
                    logInfo(`Key ${key} was written to during read operation.`);
                    resolve(this.#cache[key]);
                    return;
                }

                if (chrome.runtime.lastError) {
                    console.error('Failed to query DevTools data', chrome.runtime.lastError);
                    resolve(null);
                    return;
                }

                this.#cache[key] = result.key;
                resolve(result.key);
            });
        });
    }

    /**
     * @param {string} key
     * @param {string} value
     */
    set(key, value) {
        this.#cache[key] = value;
        chrome.storage.local.set({[key]: value}, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to write DevTools data', chrome.runtime.lastError);
            }
        });
    }

    /**
     * @param {string} key
     */
    remove(key) {
        this.#cache[key] = undefined;
        chrome.storage.local.remove(key, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to delete DevTools data', chrome.runtime.lastError);
            }
        });
    }

    /**
     * @param {string} key
     */
    async has(key) {
        return Boolean(await this.get(key));
    }
}

/**
 * @implements {DevToolsStorage}
 */
class LocalStorageWrapper {
    setDataIsMigratedForTesting() {
        if (__DEBUG__) {
            logWarn('Unexpected call to setDataIsMigratedForTesting');
        }
    }

    /**
     * @param {string} key
     * @returns {Promise<string>}
     */
    async get(key) {
        try {
            return localStorage.getItem(key);
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    /**
     * @param {string} key
     * @param {string} value
     */
    set(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * @param {string} key
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * @param {string} key
     */
    async has(key) {
        try {
            return localStorage.getItem(key) != null;
        } catch (err) {
            console.error(err);
            return false;
        }
    }
}

/**
 * @implements {DevToolsStorage}
 */
class TempStorage {
    setDataIsMigratedForTesting() {
        if (__DEBUG__) {
            logWarn('Unexpected call to setDataIsMigratedForTesting');
        }
    }

    /** @type {Map<string, string>} */
    map = new Map();

    /**
     * @param {string} key
     * @returns {Promise<string>}
     */
    async get(key) {
        return this.map.get(key);
    }

    /**
     * @param {string} key
     * @param {string} value
     */
    set(key, value) {
        this.map.set(key, value);
    }

    /**
     * @param {string} key
     */
    remove(key) {
        this.map.delete(key);
    }

    /**
     * @param {string} key
     */
    async has(key) {
        return this.map.has(key);
    }
}

export default class DevTools {
    /** @type {ConfigManager} */
    #config;
    /** @type {() => void} */
    #onChange;
    /** @type {DevToolsStorage} */
    #store;

    /**
     * @param {ConfigManager} config
     * @param {() => void} onChange
     */
    constructor(config, onChange) {
        // Firefox don't seem to like using storage.local to store big data on the background-extension.
        // Disabling it for now and defaulting back to localStorage.
        if (typeof chrome.storage.local !== 'undefined' && chrome.storage.local !== null && !isFirefox) {
            this.store = new PersistentStorageWrapper();
        } else if (typeof localStorage !== 'undefined' && localStorage != null) {
            this.store = new LocalStorageWrapper();
        } else {
            this.store = new TempStorage();
        }
        this.#config = config;
        this.#loadConfigOverrides();
        this.#onChange = onChange;
    }

    // TODO(bershanskiy): make private again once PersistentStorageWrapper removes migration logic.
    // Part 2 of 2.
    static KEY_DYNAMIC = 'dev_dynamic_theme_fixes';
    static KEY_FILTER = 'dev_inversion_fixes';
    static KEY_STATIC = 'dev_static_themes';

    /**
     * @param {boolean} value
     */
    setDataIsMigratedForTesting(value) {
        this.#store.setDataIsMigratedForTesting(value);
    }

    async #loadConfigOverrides() {
        this.#config.overrides.dynamicThemeFixes = await this.#getSavedDynamicThemeFixes() || null;
        this.#config.overrides.inversionFixes = await this.#getSavedInversionFixes() || null;
        this.#config.overrides.staticThemes = await this.#getSavedStaticThemes() || null;
    }

    async #getSavedDynamicThemeFixes() {
        return this.#store.get(DevTools.KEY_DYNAMIC);
    }

    #saveDynamicThemeFixes(/** @type {string} */text) {
        this.#store.set(DevTools.KEY_DYNAMIC, text);
    }

    async hasCustomDynamicThemeFixes() {
        return this.#store.has(DevTools.KEY_DYNAMIC);
    }

    async getDynamicThemeFixesText() {
        const $fixes = await this.#getSavedDynamicThemeFixes();
        const fixes = $fixes ? parseDynamicThemeFixes($fixes) : parseDynamicThemeFixes(this.#config.DYNAMIC_THEME_FIXES_RAW);
        return formatDynamicThemeFixes(fixes);
    }

    resetDynamicThemeFixes() {
        this.#store.remove(DevTools.KEY_DYNAMIC);
        this.#config.overrides.dynamicThemeFixes = null;
        this.#config.handleDynamicThemeFixes();
        this.#onChange();
    }

    applyDynamicThemeFixes(/** @type {string} */text) {
        try {
            const formatted = formatDynamicThemeFixes(parseDynamicThemeFixes(text));
            this.#config.overrides.dynamicThemeFixes = formatted;
            this.#config.handleDynamicThemeFixes();
            this.#saveDynamicThemeFixes(formatted);
            this.#onChange();
            return null;
        } catch (err) {
            return err;
        }
    }

    async #getSavedInversionFixes() {
        return this.#store.get(DevTools.KEY_FILTER);
    }

    #saveInversionFixes(/** @type {string} */text) {
        this.#store.set(DevTools.KEY_FILTER, text);
    }

    async hasCustomFilterFixes() {
        return this.#store.has(DevTools.KEY_FILTER);
    }

    async getInversionFixesText() {
        const $fixes = await this.#getSavedInversionFixes();
        const fixes = $fixes ? parseInversionFixes($fixes) : parseInversionFixes(this.#config.INVERSION_FIXES_RAW);
        return formatInversionFixes(fixes);
    }

    resetInversionFixes() {
        this.#store.remove(DevTools.KEY_FILTER);
        this.#config.overrides.inversionFixes = null;
        this.#config.handleInversionFixes();
        this.#onChange();
    }

    applyInversionFixes(/** @type {string} */text) {
        try {
            const formatted = formatInversionFixes(parseInversionFixes(text));
            this.#config.overrides.inversionFixes = formatted;
            this.#config.handleInversionFixes();
            this.#saveInversionFixes(formatted);
            this.#onChange();
            return null;
        } catch (err) {
            return err;
        }
    }

    async #getSavedStaticThemes() {
        return this.#store.get(DevTools.KEY_STATIC);
    }

    #saveStaticThemes(/** @type {string} */text) {
        this.#store.set(DevTools.KEY_STATIC, text);
    }

    async hasCustomStaticFixes() {
        return this.#store.has(DevTools.KEY_STATIC);
    }

    async getStaticThemesText() {
        const $themes = await this.#getSavedStaticThemes();
        const themes = $themes ? parseStaticThemes($themes) : parseStaticThemes(this.#config.STATIC_THEMES_RAW);
        return formatStaticThemes(themes);
    }

    resetStaticThemes() {
        this.#store.remove(DevTools.KEY_STATIC);
        this.#config.overrides.staticThemes = null;
        this.#config.handleStaticThemes();
        this.#onChange();
    }

    applyStaticThemes(/** @type {string} */text) {
        try {
            const formatted = formatStaticThemes(parseStaticThemes(text));
            this.#config.overrides.staticThemes = formatted;
            this.#config.handleStaticThemes();
            this.#saveStaticThemes(formatted);
            this.#onChange();
            return null;
        } catch (err) {
            return err;
        }
    }
}
