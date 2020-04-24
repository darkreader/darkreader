import {m} from 'malevic';
import {Theme} from '../../../definitions';
import {isURLInList} from '../../../utils/url';
import {Brightness, Contrast, Scheme, Mode} from '../theme/controls';
import ThemePresetPicker from '../theme/preset-picker';
import {getCurrentThemePreset} from '../theme/utils';
import {ViewProps} from '../types';

function ThemeControls(props: {theme: Theme; onChange: (theme: Partial<Theme>) => void}) {
    const {theme, onChange} = props;
    return (
        <section class="m-section m-theme-controls">
            <Brightness
                value={theme.brightness}
                onChange={(v) => onChange({brightness: v})}
            />
            <Contrast
                value={theme.contrast}
                onChange={(v) => onChange({contrast: v})}
            />
            <Scheme
                isDark={theme.mode === 1}
                onChange={(isDark) => onChange({mode: isDark ? 1 : 0})}
            />
            <Mode
                mode={theme.engine}
                onChange={(mode) => onChange({engine: mode})}
            />
        </section>
    );
}

export default function ThemeGroup(props: ViewProps) {
    const preset = getCurrentThemePreset(props);

    return (
        <div class="m-theme-group">
            <div class="m-theme-group__presets-wrapper">
                <ThemePresetPicker {...props} />
            </div>
            <div class="m-theme-group__controls-wrapper">
                <ThemeControls
                    theme={preset.theme}
                    onChange={preset.change}
                />
            </div>
            <label class="m-theme-group__description">
                Configure theme
            </label>
        </div>
    );
}


