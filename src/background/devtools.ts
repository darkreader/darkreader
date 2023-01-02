import {logInfo} from './utils/log';
import {parseInversionFixes, formatInversionFixes} from '../generators/css-filter';
import {parseDynamicThemeFixes, formatDynamicThemeFixes} from '../generators/dynamic-theme';
import {parseStaticThemes, formatStaticThemes} from '../generators/static-theme';
import ConfigManager from './config-manager';
import {isFirefox} from '../utils/platform';

// TODO(bershanskiy): Add support for reads/writes of multiple keys at once for performance.
// TODO(bershanskiy): Popup UI heeds only hasCustom*Fixes() and nothing else. Consider storing that data separatelly.
interface DevToolsStorage {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void> | void;
    remove(key: string): Promise<void> | void;
    has(key: string): Promise<boolean> | boolean;
}

class PersistentStorageWrapper implements DevToolsStorage {
    // Cache information within background context for future use without waiting.
    private cache: {[key: string]: string | null} = {};

    async get(key: string) {
        if (key in this.cache) {
            return this.cache[key];
        }
        return new Promise<string | null>((resolve) => {
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
        this.cache[key] = null;
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

class TempStorage implements DevToolsStorage {
    map = new Map<string, string>();

    async get(key: string) {
        return this.map.get(key) || null;
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
        } else {
            this.store = new TempStorage();
        }
        this.loadConfigOverrides();
        this.onChange = onChange;
    }

    private static KEY_DYNAMIC = 'dev_dynamic_theme_fixes';
    private static KEY_FILTER = 'dev_inversion_fixes';
    private static KEY_STATIC = 'dev_static_themes';

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
        let rawFixes = await this.getSavedDynamicThemeFixes();
        if (!rawFixes) {
            await ConfigManager.load();
            rawFixes = ConfigManager.DYNAMIC_THEME_FIXES_RAW || '';
        }
        const fixes = parseDynamicThemeFixes(rawFixes);
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
        let rawFixes = await this.getSavedInversionFixes();
        if (!rawFixes) {
            await ConfigManager.load();
            rawFixes = ConfigManager.INVERSION_FIXES_RAW || '';
        }
        const fixes = parseInversionFixes(rawFixes);
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
        let rawThemes = await this.getSavedStaticThemes();
        if (!rawThemes) {
            await ConfigManager.load();
            rawThemes = ConfigManager.STATIC_THEMES_RAW || '';
        }
        const themes = parseStaticThemes(rawThemes);
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
