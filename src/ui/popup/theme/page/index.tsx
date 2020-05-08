import {m} from 'malevic';
import {DEFAULT_SETTINGS} from '../../../../defaults';
import {ViewProps} from '../../types';
import {Brightness, Contrast, Grayscale, Mode, Scheme, Sepia, Scrollbar} from '../controls';
import ThemePresetPicker from '../preset-picker';
import {getCurrentThemePreset} from '../utils';
import ResetButton from '../controls/reset-button';

export default function ThemePage(props: ViewProps) {
    const {theme, change} = getCurrentThemePreset(props);

    return (
        <section class="m-section theme-page">
            <ThemePresetPicker {...props} />
            <Brightness
                value={theme.brightness}
                onChange={(v) => change({brightness: v})}
            />
            <Contrast
                value={theme.contrast}
                onChange={(v) => change({contrast: v})}
            />
            <Sepia
                value={theme.sepia}
                onChange={(v) => change({sepia: v})}
            />
            <Grayscale
                value={theme.grayscale}
                onChange={(v) => change({grayscale: v})}
            />
            <Scheme
                isDark={theme.mode === 1}
                onChange={(isDark) => change({mode: isDark ? 1 : 0})}
            />
            <Mode
                mode={theme.engine}
                onChange={(mode) => change({engine: mode})}
            />
            <Scrollbar
                value={theme.scrollbarColor}
                onChange={(v) => props.actions.setTheme({scrollbarColor: v})}
                onReset={() => props.actions.setTheme({scrollbarColor: DEFAULT_SETTINGS.theme.scrollbarColor})}
            />
            <ResetButton {...props} />
        </section>
    );
}
