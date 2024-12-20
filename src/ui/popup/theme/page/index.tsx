import {m} from 'malevic';

import {DEFAULT_SETTINGS, DEFAULT_THEME, DEFAULT_COLORS} from '../../../../defaults';
import type {Theme, ViewProps} from '../../../../definitions';
import {ThemeEngine} from '../../../../generators/theme-engines';
import type {ParsedColorSchemeConfig} from '../../../../utils/colorscheme-parser';
import {isURLEnabled, isURLInList} from '../../../../utils/url';
import {
    BackgroundColor,
    Brightness,
    ColorSchemeDropDown,
    Contrast,
    ExportTheme,
    FontPicker,
    Grayscale,
    ImmediateModify,
    Mode,
    ResetButton,
    Scheme,
    Scrollbar,
    SelectionColorEditor,
    Sepia,
    StyleSystemControls,
    TextColor,
    TextStroke,
    UseFont,
} from '../controls';
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

interface ColorsGroupProps extends ThemeGroupProps {
    colorSchemes: ParsedColorSchemeConfig;
}

function ColorsGroup({theme, change, colorSchemes}: ColorsGroupProps) {
    const isDarkScheme = theme.mode === 1;
    const csProp: keyof Theme = isDarkScheme ? 'darkColorScheme' : 'lightColorScheme';
    const bgProp: keyof Theme = isDarkScheme ? 'darkSchemeBackgroundColor' : 'lightSchemeBackgroundColor';
    const fgProp: keyof Theme = isDarkScheme ? 'darkSchemeTextColor' : 'lightSchemeTextColor';
    const defaultSchemeColors = isDarkScheme ? DEFAULT_COLORS.darkScheme : DEFAULT_COLORS.lightScheme;
    const defaultMatrixValues: Partial<Theme> = {brightness: DEFAULT_THEME.brightness, contrast: DEFAULT_THEME.contrast, sepia: DEFAULT_THEME.sepia, grayscale: DEFAULT_THEME.grayscale};
    const currentColorScheme = isDarkScheme ? theme.darkColorScheme : theme.lightColorScheme;
    const currentSchemeColors = isDarkScheme ? colorSchemes.dark : colorSchemes.light;
    const sortedColorSchemeValues: Array<{id: string; content: string}> = Object.keys(currentSchemeColors)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => {
            return {id: value, content: value};
        });

    function onColorSchemeChange(newColor: string) {
        change({[csProp]: newColor});
        change({[bgProp]: currentSchemeColors[newColor].backgroundColor});
        change({[fgProp]: currentSchemeColors[newColor].textColor});
    }

    return (
        <Array>
            <BackgroundColor
                value={theme[bgProp] === 'auto' ? defaultSchemeColors.background : theme[bgProp]}
                onChange={(v) => change({[bgProp]: v, ...defaultMatrixValues, [csProp]: 'Default'})}
                canReset={theme[bgProp] !== defaultSchemeColors.background}
                onReset={() => change({[bgProp]: DEFAULT_SETTINGS.theme[bgProp], [csProp]: 'Default'})}
            />
            <TextColor
                value={theme[fgProp] === 'auto' ? defaultSchemeColors.text : theme[fgProp]}
                onChange={(v) => change({[fgProp]: v, ...defaultMatrixValues, [csProp]: 'Default'})}
                canReset={theme[fgProp] !== defaultSchemeColors.text}
                onReset={() => change({[fgProp]: DEFAULT_SETTINGS.theme[fgProp], [csProp]: 'Default'})}
            />
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
            <ColorSchemeDropDown
                selected={currentColorScheme}
                values={sortedColorSchemeValues}
                onChange={(v) => onColorSchemeChange(v)}
            />
        </Array>
    );
}

interface FontGroupsProps extends ThemeGroupProps {
    fonts: string[];
    viewProps: ViewProps;
}

function FontGroup({theme, fonts, viewProps, change}: FontGroupsProps) {
    const {settings, activeTab, isAllowedFileSchemeAccess} = viewProps.data;
    const {isDarkThemeDetected, isInDarkList, isInjected, isProtected} = activeTab;

    const custom = settings.customThemes.find((custom) => isURLInList(activeTab.url, custom.url));
    const engine = custom ? custom.theme.engine : settings.theme.engine;
    const canExportTheme = engine === ThemeEngine.dynamicTheme && activeTab.id
        && !isDarkThemeDetected && !isInDarkList && !isProtected && isInjected !== false
        && isURLEnabled(activeTab.url, settings, activeTab, isAllowedFileSchemeAccess);

    return (
        <Array>
            <UseFont
                value={theme.useFont}
                onChange={(useFont) => change({useFont})}
            />
            <FontPicker
                theme={theme}
                fonts={fonts}
                onChange={(fontFamily) => change({fontFamily})}
            />
            <TextStroke
                value={theme.textStroke}
                onChange={(textStroke) => change({textStroke})}
            />
            <StyleSystemControls
                value={theme.styleSystemControls}
                onChange={(styleSystemControls) => change({styleSystemControls})}
            />
            <ImmediateModify
                value={theme.immediateModify}
                onChange={(immediateModify) => change({immediateModify})}
            />
            {canExportTheme ? <ExportTheme {...viewProps} /> : null}
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
                    <ColorsGroup theme={theme} change={change} colorSchemes={props.data.colorScheme} />
                </Collapsible.Group>
                <Collapsible.Group id="font" label="Font & more">
                    <FontGroup theme={theme} fonts={props.fonts!} viewProps={props} change={change} />
                </Collapsible.Group>
            </Collapsible>
            <ResetButton {...props} />
        </section>
    );
}
