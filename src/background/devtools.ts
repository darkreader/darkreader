import {parseInversionFixes, formatInversionFixes} from '../generators/css-filter';
import {parseDynamicThemeFixes, formatDynamicThemeFixes} from '../generators/dynamic-theme';
import {parseStaticThemes, formatStaticThemes} from '../generators/static-theme';
import ConfigManager from './config-manager';

export default class DevTools {
    private config: ConfigManager;
    private onChange: () => void;

    constructor(config: ConfigManager, onChange: () => void) {
        this.config = config;
        this.config.overrides.dynamicThemeFixes = this.getSavedDynamicThemeFixes() || null;
        this.config.overrides.inversionFixes = this.getSavedInversionFixes() || null;
        this.config.overrides.staticThemes = this.getSavedStaticThemes() || null;
        this.onChange = onChange;
    }

    private getSavedDynamicThemeFixes() {
        return localStorage.getItem('dev_dynamic_theme_fixes') || null;
    }

    private saveDynamicThemeFixes(text: string) {
        localStorage.setItem('dev_dynamic_theme_fixes', text);
    }

    getDynamicThemeFixesText() {
        const $fixes = this.getSavedDynamicThemeFixes();
        const fixes = $fixes ? parseDynamicThemeFixes($fixes) : this.config.DYNAMIC_THEME_FIXES;
        return formatDynamicThemeFixes(fixes);
    }

    resetDynamicThemeFixes() {
        localStorage.removeItem('dev_dynamic_theme_fixes');
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
        return localStorage.getItem('dev_inversion_fixes') || null;
    }

    private saveInversionFixes(text: string) {
        localStorage.setItem('dev_inversion_fixes', text);
    }

    getInversionFixesText() {
        const $fixes = this.getSavedInversionFixes();
        const fixes = $fixes ? parseInversionFixes($fixes) : this.config.INVERSION_FIXES;
        return formatInversionFixes(fixes);
    }

    resetInversionFixes() {
        localStorage.removeItem('dev_inversion_fixes');
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
        return localStorage.getItem('dev_static_themes') || null;
    }

    private saveStaticThemes(text: string) {
        localStorage.setItem('dev_static_themes', text);
    }

    getStaticThemesText() {
        const $themes = this.getSavedStaticThemes();
        const themes = $themes ? parseStaticThemes($themes) : this.config.STATIC_THEMES;
        return formatStaticThemes(themes);
    }

    resetStaticThemes() {
        localStorage.removeItem('dev_static_themes');
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
