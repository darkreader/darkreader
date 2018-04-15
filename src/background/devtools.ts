import {parseInversionFixes, formatInversionFixes} from '../generators/css-filter';
import {parseDynamicThemeFixes, formatDynamicThemeFixes} from '../generators/dynamic-theme';
import {parseStaticThemes, formatStaticThemes} from '../generators/static-theme';
import ConfigManager from './config-manager';

export default class DevTools {
    private config: ConfigManager;
    private onChange: () => void;

    constructor(config: ConfigManager, onChange: () => void) {
        this.config = config;
        this.onChange = onChange;
    }

    private getSavedDynamicThemeFixes() {
        return localStorage.getItem('dev_dynamic_theme_fixes') || null;
    }

    private saveDynamicThemeFixes(text: string) {
        localStorage.setItem('dev_dynamic_theme_fixes', text);
    }

    getDynamicThemeFixesText() {
        const {RAW_DYNAMIC_THEME_FIXES} = this.config;
        const fixes = this.getSavedDynamicThemeFixes();
        return fixes ? formatDynamicThemeFixes(parseDynamicThemeFixes(fixes)) : RAW_DYNAMIC_THEME_FIXES;
    }

    resetDynamicThemeFixes() {
        const {RAW_DYNAMIC_THEME_FIXES} = this.config;
        localStorage.removeItem('dev_dynamic_theme_fixes');
        this.config.handleInversionFixes(RAW_DYNAMIC_THEME_FIXES);
        this.onChange();
    }

    applyDynamicThemeFixes(text: string) {
        try {
            const formatted = formatDynamicThemeFixes(parseDynamicThemeFixes(text));
            this.config.handleDynamicThemeFixes(formatted);
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
        const {RAW_INVERSION_FIXES} = this.config;
        const fixes = this.getSavedInversionFixes();
        return fixes ? formatInversionFixes(parseInversionFixes(fixes)) : RAW_INVERSION_FIXES;
    }

    resetInversionFixes() {
        const {RAW_INVERSION_FIXES} = this.config;
        localStorage.removeItem('dev_inversion_fixes');
        this.config.handleInversionFixes(RAW_INVERSION_FIXES);
        this.onChange();
    }

    applyInversionFixes(text: string) {
        try {
            const formatted = formatInversionFixes(parseInversionFixes(text));
            this.config.handleInversionFixes(formatted);
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
        const {RAW_STATIC_THEMES} = this.config;
        const themes = this.getSavedStaticThemes();
        return themes ? formatStaticThemes(parseStaticThemes(themes)) : RAW_STATIC_THEMES;
    }

    resetStaticThemes() {
        const {RAW_STATIC_THEMES} = this.config;
        localStorage.removeItem('dev_static_themes');
        this.config.handleStaticThemes(RAW_STATIC_THEMES);
        this.onChange();
    }

    applyStaticThemes(text: string) {
        try {
            const formatted = formatStaticThemes(parseStaticThemes(text));
            this.config.handleStaticThemes(formatted);
            this.saveStaticThemes(formatted);
            this.onChange();
            return null;
        } catch (err) {
            return err;
        }
    }
}
