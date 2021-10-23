import {logInfo} from '../utils/log';
import {parseInversionFixes, formatInversionFixes} from '../generators/css-filter';
import {parseDynamicThemeFixes, formatDynamicThemeFixes} from '../generators/dynamic-theme';
import {parseStaticThemes, formatStaticThemes} from '../generators/static-theme';
import type ConfigManager from './config-manager';

// TODO(bershanskiy): add migration path for moving data from LocalStorageWrapper
// into PersistentStorageWrapper. LocalStorageWrapper data might become inaccessible upon
// update from MV2 to MV3 because service workers don't have localStorage.
// TODO(bershanskiy): Add support for reads/writes of multiple keys at once for performance.
// TODO(bershanskiy): Popup UI heeds only hasCustom*Fixes() and nothing else. Consider storing that data separatelly.
interface DevToolsStorage {
    get(key: string): Promise<string>;
    set(key: string, value: string): void;
    remove(key: string): void;
    has(key: string): Promise<boolean>;
}

class PersistentStorageWrapper implements DevToolsStorage {
    // Cache information within background context for future use without waiting.
    private cache: {[key: string]: string} = {};

    async get(key: string) {
        if (key in this.cache) {
            return this.cache[key];
        }
        return new Promise<string>((resolve) => {
            chrome.storage.local.get(key, (result) => {
                // If cache received a new value (from call to set())
                // before we retreived an old value from storage,
                // return the new value.
                if (key in this.cache) {
                    logInfo(`Key ${key} was written to during read operation.`);
                    resolve(this.cache[key]);
                    return;
                }

                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    resolve(null);
                    return;
                }

                this.cache[key] = result.key;
                resolve(result.key);
            });
        });
    }

    set(key: string, value: string) {
        this.cache[key] = value;
        chrome.storage.local.set({[key]: value});
    }

    remove(key: string) {
        this.cache[key] = undefined;
        chrome.storage.local.remove(key);
    }

    async has(key: string) {
        return Boolean(await this.get(key));
    }
}

class LocalStorageWrapper implements DevToolsStorage {
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
    private config: ConfigManager;
    private onChange: () => void;
    private store: DevToolsStorage;

    constructor(config: ConfigManager, onChange: () => void) {
        if (typeof chrome.storage.local !== 'undefined' && chrome.storage.local !== null) {
            this.store = new PersistentStorageWrapper();
        } else if (typeof localStorage !== 'undefined' && localStorage != null) {
            this.store = new LocalStorageWrapper();
        } else {
            this.store = new TempStorage();
        }
        this.config = config;
        this.loadConfigOverrides();
        this.onChange = onChange;
    }

    private static KEY_DYNAMIC = 'dev_dynamic_theme_fixes';
    private static KEY_FILTER = 'dev_inversion_fixes';
    private static KEY_STATIC = 'dev_static_themes';

    private async loadConfigOverrides() {
        this.config.overrides.dynamicThemeFixes = await this.getSavedDynamicThemeFixes() || null;
        this.config.overrides.inversionFixes = await this.getSavedInversionFixes() || null;
        this.config.overrides.staticThemes = await this.getSavedStaticThemes() || null;
    }

    private async getSavedDynamicThemeFixes() {
        return this.store.get(DevTools.KEY_DYNAMIC) || null;
    }

    private saveDynamicThemeFixes(text: string) {
        this.store.set(DevTools.KEY_DYNAMIC, text);
    }

    async hasCustomDynamicThemeFixes() {
        return this.store.has(DevTools.KEY_DYNAMIC);
    }

    async getDynamicThemeFixesText() {
        const $fixes = await this.getSavedDynamicThemeFixes();
        const fixes = $fixes ? parseDynamicThemeFixes($fixes) : parseDynamicThemeFixes(this.config.DYNAMIC_THEME_FIXES_RAW);
        return formatDynamicThemeFixes(fixes);
    }

    resetDynamicThemeFixes() {
        this.store.remove(DevTools.KEY_DYNAMIC);
        this.config.overrides.dynamicThemeFixes = null;
        this.config.handleDynamicThemeFixes();
        this.onChange();
    }

    applyDynamicThemeFixes(text: string) {
        try {
            const formatted = formatDynamicThemeFixes(parseDynamicThemeFixes(text));
            this.config.overrides.dynamicThemeFixes = formatted;
            this.config.handleDynamicThemeFixes();
            this.saveDynamicThemeFixes(formatted);
            this.onChange();
            return null;
        } catch (err) {
            return err;
        }
    }

    private async getSavedInversionFixes() {
        return this.store.get(DevTools.KEY_FILTER) || null;
    }

    private saveInversionFixes(text: string) {
        this.store.set(DevTools.KEY_FILTER, text);
    }

    async hasCustomFilterFixes() {
        return this.store.has(DevTools.KEY_FILTER);
    }

    async getInversionFixesText() {
        const $fixes = await this.getSavedInversionFixes();
        const fixes = $fixes ? parseInversionFixes($fixes) : parseInversionFixes(this.config.INVERSION_FIXES_RAW);
        return formatInversionFixes(fixes);
    }

    resetInversionFixes() {
        this.store.remove(DevTools.KEY_FILTER);
        this.config.overrides.inversionFixes = null;
        this.config.handleInversionFixes();
        this.onChange();
    }

    applyInversionFixes(text: string) {
        try {
            const formatted = formatInversionFixes(parseInversionFixes(text));
            this.config.overrides.inversionFixes = formatted;
            this.config.handleInversionFixes();
            this.saveInversionFixes(formatted);
            this.onChange();
            return null;
        } catch (err) {
            return err;
        }
    }

    private async getSavedStaticThemes() {
        return this.store.get(DevTools.KEY_STATIC) || null;
    }

    private saveStaticThemes(text: string) {
        this.store.set(DevTools.KEY_STATIC, text);
    }

    async hasCustomStaticFixes() {
        return this.store.has(DevTools.KEY_STATIC);
    }

    async getStaticThemesText() {
        const $themes = await this.getSavedStaticThemes();
        const themes = $themes ? parseStaticThemes($themes) : parseStaticThemes(this.config.STATIC_THEMES_RAW);
        return formatStaticThemes(themes);
    }

    resetStaticThemes() {
        this.store.remove(DevTools.KEY_STATIC);
        this.config.overrides.staticThemes = null;
        this.config.handleStaticThemes();
        this.onChange();
    }

    applyStaticThemes(text: string) {
        try {
            const formatted = formatStaticThemes(parseStaticThemes(text));
            this.config.overrides.staticThemes = formatted;
            this.config.handleStaticThemes();
            this.saveStaticThemes(formatted);
            this.onChange();
            return null;
        } catch (err) {
            return err;
        }
    }
}
