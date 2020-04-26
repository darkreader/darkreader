import {m} from 'malevic';
import {ViewProps} from '../../types';
import {Brightness, Contrast, Grayscale, Mode, Scheme, Sepia} from '../controls';
import ThemePresetPicker from '../preset-picker';
import {getCurrentThemePreset} from '../utils';
import ThemeEngines from '../../../../generators/theme-engines'

export default function ThemePage(props: ViewProps) {
    const {theme, change} = getCurrentThemePreset(props);

    return (
        <section class="m-section theme-page">
            <ThemePresetPicker {...props} />
            <Brightness
                value={theme.brightness}
                resetFunction={() => change({brightness: 100})}
                onChange={(v) => change({brightness: v})}
            />
            <Contrast
                value={theme.contrast}
                resetFunction={() => change({contrast: 100})}
                onChange={(v) => change({contrast: v})}
           />
            <Sepia
                value={theme.sepia}
                resetFunction={() => change({sepia: 0})}
                onChange={(v) => change({sepia: v})}
            />
            <Grayscale
                value={theme.grayscale}
                resetFunction={() => change({grayscale: 0})}
                onChange={(v) => change({grayscale: v})}
            />
            <Scheme
                isDark={theme.mode === 1}
                resetFunction={() => change({mode: 1})}
                onChange={(isDark) => change({mode: isDark ? 1 : 0})}
            />
            <Mode
                mode={theme.engine}
                resetFunction={() => change({engine: ThemeEngines.dynamicTheme})}
                onChange={(mode) => change({engine: mode})}
            />
        </section>
    );
}
