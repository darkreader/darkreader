import {m} from 'malevic';
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
                selected={props.data.settings.scrollbarSelected}
                hexColor={props.data.settings.scrollbarColor}
                onChange={(v) => props.actions.changeSettings({scrollbarSelected: v})}
                onColorChange={(v) => props.actions.changeSettings({scrollbarColor: v, scrollbarSelected: v})}
            />
            <ResetButton {...props}/>
        </section>
    );
}
