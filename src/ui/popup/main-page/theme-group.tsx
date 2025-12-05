import {m} from 'malevic';

import type {Theme, ViewProps} from '../../../definitions';
import {Button} from '../../controls';
import {Brightness, Contrast, Scheme, Mode} from '../theme/controls';
import ThemePresetPicker from '../theme/preset-picker';
import {getCurrentThemePreset} from '../theme/utils';

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

export default function ThemeGroup(props: ViewProps & {onThemeNavClick: () => void}) {
    const preset = getCurrentThemePreset(props);

    return (
        <div class="theme-group">
            <div class="theme-group__presets-wrapper">
                <ThemePresetPicker {...props} />
            </div>
            <div class="theme-group__controls-wrapper">
                <ThemeControls
                    theme={preset.theme}
                    onChange={preset.change}
                />
                <Button class="theme-group__more-button" onclick={props.onThemeNavClick}>
                    See all options
                </Button>
            </div>
            <label class="theme-group__description">
                Configure theme
            </label>
        </div>
    );
}
