import {formatJson} from '../config/utils'
import {parseUrlSelectorConfig, formatUrlSelectorConfig} from '../generators/static-theme';
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

    private saveInversionFixes(json: string) {
        localStorage.setItem('dev_inversion_fixes', json);
    }

    getInversionFixesText() {
        const {RAW_INVERSION_FIXES} = this.config;
        const fixes = this.getSavedInversionFixes();
        return formatJson(fixes ? JSON.parse(fixes) : RAW_INVERSION_FIXES);
    }

    resetInversionFixes() {
        const {RAW_INVERSION_FIXES} = this.config;
        localStorage.removeItem('dev_inversion_fixes');
        this.config.handleInversionFixes(RAW_INVERSION_FIXES);
        this.onChange();
    }

    applyInversionFixes(json: string) {
        try {
            const obj = JSON.parse(json);
            const text = formatJson(obj);
            this.saveInversionFixes(text);
            this.config.handleInversionFixes(obj);
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
        const fixes = this.getSavedStaticThemes();
        return fixes ? formatUrlSelectorConfig(parseUrlSelectorConfig(fixes)) : RAW_STATIC_THEMES;
    }

    resetStaticThemes() {
        const {RAW_STATIC_THEMES} = this.config;
        localStorage.removeItem('dev_static_themes');
        this.config.handleStaticThemes(RAW_STATIC_THEMES);
        this.onChange();
    }

    applyStaticThemes(text: string) {
        try {
            const formatted = formatUrlSelectorConfig(parseUrlSelectorConfig(text));
            this.config.handleStaticThemes(formatted);
            this.saveStaticThemes(formatted);
            this.onChange();
            return null;
        } catch (err) {
            return err;
        }
    }
}
