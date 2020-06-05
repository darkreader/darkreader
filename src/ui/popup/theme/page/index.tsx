import {m} from 'malevic';
import {DEFAULT_SETTINGS} from '../../../../defaults';
import {Theme} from '../../../../definitions';
import {ViewProps} from '../../types';
import {Brightness, Contrast, Grayscale, Mode, ResetButton, Scheme, Scrollbar, SelectionColorEditor, Sepia} from '../controls';
import ThemePresetPicker from '../preset-picker';
import {getCurrentThemePreset} from '../utils';
import Collapsible from './collapsible-panel';

interface ThemeGroupProps {
    theme: Theme;
    change: (theme: Partial<Theme>) => void;
}

function MainGroup({theme, change}: ThemeGroupProps) {
    return (
        <Array>
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
        </Array>
    );
}

function ColorsGroup({theme, change}: ThemeGroupProps) {
    return (
        <Array>
            <Scrollbar
                value={theme.scrollbarColor}
                onChange={(v) => change({scrollbarColor: v})}
                onReset={() => change({scrollbarColor: DEFAULT_SETTINGS.theme.scrollbarColor})}
            />
            <SelectionColorEditor
                value={theme.selectionColor}
                onChange={(v) => change({selectionColor: v})}
                onReset={() => change({selectionColor: DEFAULT_SETTINGS.theme.selectionColor})}
            />
        </Array>
    );
}

export default function ThemePage(props: ViewProps) {
    const {theme, change} = getCurrentThemePreset(props);

    return (
        <section class="m-section theme-page">
            <ThemePresetPicker {...props} />
            <Collapsible>
                <Collapsible.Group id="main" label="Brightness, contrast, mode">
                    <MainGroup theme={theme} change={change} />
                </Collapsible.Group>
                <Collapsible.Group id="colors" label="Colors">
                    <ColorsGroup theme={theme} change={change} />
                </Collapsible.Group>
            </Collapsible>
            <ResetButton {...props} />
        </section>
    );
}
