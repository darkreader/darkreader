import {parseInversionFixes, formatInversionFixes} from '../generators/css-filter';
import {parseStaticThemes, formatStaticThemes} from '../generators/static-theme';
import ConfigManager from './config-manager';

export default class DevTools {
    private config: ConfigManager;
    private onChange: () => void;

    constructor(config: ConfigManager, onChange: () => void) {
        this.config = config;
        this.onChange = onChange;
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
