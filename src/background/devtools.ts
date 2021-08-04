import {parseInversionFixes, formatInversionFixes} from '../generators/css-filter';
import {parseDynamicThemeFixes, formatDynamicThemeFixes} from '../generators/dynamic-theme';
import {parseStaticThemes, formatStaticThemes} from '../generators/static-theme';
import type ConfigManager from './config-manager';

interface DevToolsStorage {
    get(key: string): string;
    set(key: string, value: string): void;
    remove(key: string): void;
    has(key: string): boolean;
}

class LocalStorageWrapper implements DevToolsStorage {
    get(key: string) {
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
    has(key: string) {
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

    get(key: string) {
        return this.map.get(key);
    }
    set(key: string, value: string) {
        this.map.set(key, value);
    }
    remove(key: string) {
        this.map.delete(key);
    }
    has(key: string) {
        return this.map.has(key);
    }
}

export default class DevTools {
    private config: ConfigManager;
    private onChange: () => void;
    private store: DevToolsStorage;

    constructor(config: ConfigManager, onChange: () => void) {
        this.store = (typeof localStorage !== 'undefined' && localStorage != null ?
            new LocalStorageWrapper() :
            new TempStorage());
        this.config = config;
        this.config.overrides.dynamicThemeFixes = this.getSavedDynamicThemeFixes() || null;
        this.config.overrides.inversionFixes = this.getSavedInversionFixes() || null;
        this.config.overrides.staticThemes = this.getSavedStaticThemes() || null;
        this.onChange = onChange;
    }

    private static KEY_DYNAMIC = 'dev_dynamic_theme_fixes';
    private static KEY_FILTER = 'dev_inversion_fixes';
    private static KEY_STATIC = 'dev_static_themes';

    private getSavedDynamicThemeFixes() {
        return this.store.get(DevTools.KEY_DYNAMIC) || null;
    }

    private saveDynamicThemeFixes(text: string) {
        this.store.set(DevTools.KEY_DYNAMIC, text);
    }

    hasCustomDynamicThemeFixes() {
        return this.store.has(DevTools.KEY_DYNAMIC);
    }

    getDynamicThemeFixesText() {
        const $fixes = this.getSavedDynamicThemeFixes();
        const fixes = $fixes ? parseDynamicThemeFixes($fixes) : this.config.DYNAMIC_THEME_FIXES;
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

    private getSavedInversionFixes() {
        return this.store.get(DevTools.KEY_FILTER) || null;
    }

    private saveInversionFixes(text: string) {
        this.store.set(DevTools.KEY_FILTER, text);
    }

    hasCustomFilterFixes() {
        return this.store.has(DevTools.KEY_FILTER);
    }

    getInversionFixesText() {
        const $fixes = this.getSavedInversionFixes();
        const fixes = $fixes ? parseInversionFixes($fixes) : this.config.INVERSION_FIXES;
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

    private getSavedStaticThemes() {
        return this.store.get(DevTools.KEY_STATIC) || null;
    }

    private saveStaticThemes(text: string) {
        this.store.set(DevTools.KEY_STATIC, text);
    }

    hasCustomStaticFixes() {
        return this.store.has(DevTools.KEY_STATIC);
    }

    getStaticThemesText() {
        const $themes = this.getSavedStaticThemes();
        const themes = $themes ? parseStaticThemes($themes) : this.config.STATIC_THEMES;
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
