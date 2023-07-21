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

    public async get(key: string) {
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

    public async set(key: string, value: string) {
        this.cache[key] = value;
        return new Promise<void>((resolve) => chrome.storage.local.set({[key]: value}, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to write DevTools data', chrome.runtime.lastError);
            } else {
                resolve();
            }
        }));
    }

    public async remove(key: string) {
        this.cache[key] = null;
        return new Promise<void>((resolve) => chrome.storage.local.remove(key, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to delete DevTools data', chrome.runtime.lastError);
            } else {
                resolve();
            }
        }));
    }

    public async has(key: string) {
        return Boolean(await this.get(key));
    }
}

class TempStorage implements DevToolsStorage {
    private map = new Map<string, string>();

    public async get(key: string) {
        return this.map.get(key) || null;
    }

    public set(key: string, value: string) {
        this.map.set(key, value);
    }

    public remove(key: string) {
        this.map.delete(key);
    }

    public async has(key: string) {
        return this.map.has(key);
    }
}

export default class DevTools {
    private static onChange: () => void;
    private static store: DevToolsStorage;

    public static init(onChange: () => void): void {
        // Firefox don't seem to like using storage.local to store big data on the background-extension.
        // Disabling it for now and defaulting back to localStorage.
        if (!isFirefox && typeof chrome.storage.local !== 'undefined' && chrome.storage.local !== null) {
            DevTools.store = new PersistentStorageWrapper();
        } else {
            DevTools.store = new TempStorage();
        }
        DevTools.loadConfigOverrides();
        DevTools.onChange = onChange;
    }

    private static KEY_DYNAMIC = 'dev_dynamic_theme_fixes';
    private static KEY_FILTER = 'dev_inversion_fixes';
    private static KEY_STATIC = 'dev_static_themes';

    private static async loadConfigOverrides(): Promise<void> {
        const [
            dynamicThemeFixes,
            inversionFixes,
            staticThemes,
        ] = await Promise.all([
            DevTools.getSavedDynamicThemeFixes(),
            DevTools.getSavedInversionFixes(),
            DevTools.getSavedStaticThemes(),
        ]);
        ConfigManager.overrides.dynamicThemeFixes = dynamicThemeFixes || null;
        ConfigManager.overrides.inversionFixes = inversionFixes || null;
        ConfigManager.overrides.staticThemes = staticThemes || null;
    }

    private static async getSavedDynamicThemeFixes() {
        return DevTools.store.get(DevTools.KEY_DYNAMIC);
    }

    private static saveDynamicThemeFixes(text: string) {
        DevTools.store.set(DevTools.KEY_DYNAMIC, text);
    }

    public static async getDynamicThemeFixesText(): Promise<string> {
        let rawFixes = await DevTools.getSavedDynamicThemeFixes();
        if (!rawFixes) {
            await ConfigManager.load();
            rawFixes = ConfigManager.DYNAMIC_THEME_FIXES_RAW || '';
        }
        const fixes = parseDynamicThemeFixes(rawFixes);
        return formatDynamicThemeFixes(fixes);
    }

    public static resetDynamicThemeFixes(): void {
        DevTools.store.remove(DevTools.KEY_DYNAMIC);
        ConfigManager.overrides.dynamicThemeFixes = null;
        ConfigManager.handleDynamicThemeFixes();
        DevTools.onChange();
    }

    // TODO(Anton): remove any
    public static applyDynamicThemeFixes(text: string): any {
        try {
            const formatted = formatDynamicThemeFixes(parseDynamicThemeFixes(text));
            ConfigManager.overrides.dynamicThemeFixes = formatted;
            ConfigManager.handleDynamicThemeFixes();
            DevTools.saveDynamicThemeFixes(formatted);
            DevTools.onChange();
            return null;
        } catch (err) {
            return err;
        }
    }

    private static async getSavedInversionFixes(): Promise<string | null> {
        return this.store.get(DevTools.KEY_FILTER);
    }

    private static saveInversionFixes(text: string): void {
        this.store.set(DevTools.KEY_FILTER, text);
    }

    public static async getInversionFixesText(): Promise<string> {
        let rawFixes = await DevTools.getSavedInversionFixes();
        if (!rawFixes) {
            await ConfigManager.load();
            rawFixes = ConfigManager.INVERSION_FIXES_RAW || '';
        }
        const fixes = parseInversionFixes(rawFixes);
        return formatInversionFixes(fixes);
    }

    public static resetInversionFixes(): void {
        DevTools.store.remove(DevTools.KEY_FILTER);
        ConfigManager.overrides.inversionFixes = null;
        ConfigManager.handleInversionFixes();
        DevTools.onChange();
    }

    // TODO(Anton): remove any
    public static applyInversionFixes(text: string): any {
        try {
            const formatted = formatInversionFixes(parseInversionFixes(text));
            ConfigManager.overrides.inversionFixes = formatted;
            ConfigManager.handleInversionFixes();
            DevTools.saveInversionFixes(formatted);
            DevTools.onChange();
            return null;
        } catch (err) {
            return err;
        }
    }

    private static async getSavedStaticThemes(): Promise<string | null> {
        return DevTools.store.get(DevTools.KEY_STATIC);
    }

    private static saveStaticThemes(text: string): void {
        DevTools.store.set(DevTools.KEY_STATIC, text);
    }

    public static async getStaticThemesText(): Promise<string> {
        let rawThemes = await DevTools.getSavedStaticThemes();
        if (!rawThemes) {
            await ConfigManager.load();
            rawThemes = ConfigManager.STATIC_THEMES_RAW || '';
        }
        const themes = parseStaticThemes(rawThemes);
        return formatStaticThemes(themes);
    }

    public static resetStaticThemes(): void {
        DevTools.store.remove(DevTools.KEY_STATIC);
        ConfigManager.overrides.staticThemes = null;
        ConfigManager.handleStaticThemes();
        DevTools.onChange();
    }

    // TODO(Anton): remove any
    public static applyStaticThemes(text: string): any {
        try {
            const formatted = formatStaticThemes(parseStaticThemes(text));
            ConfigManager.overrides.staticThemes = formatted;
            ConfigManager.handleStaticThemes();
            DevTools.saveStaticThemes(formatted);
            DevTools.onChange();
            return null;
        } catch (err) {
            return err;
        }
    }
}
