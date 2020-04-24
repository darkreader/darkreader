import {m} from 'malevic';
import {Theme} from '../../../definitions';
import {isURLInList, getURLHost} from '../../../utils/url';
import {DropDown} from '../../controls';
import {Brightness, Contrast, Scheme, Mode} from '../theme-controls';
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
    const host = getURLHost(props.tab.url || '');
    const custom = props.data.settings.customThemes.find(
        ({url}) => isURLInList(props.tab.url, url)
    );
    const theme = custom ?
        custom.theme :
        props.data.settings.theme;

    function setTheme(config: Partial<Theme>) {
        if (custom) {
            custom.theme = {...custom.theme, ...config};
            props.actions.changeSettings({
                customThemes: props.data.settings.customThemes,
            });
        } else {
            props.actions.setTheme(config);
        }
    }

    const defaultPresetName = 'Default theme';
    const customPresetName = `Custom for ${host}`;

    function onPresetChange(name: string) {
        const filteredCustomThemes = props.data.settings.customThemes.filter(({url}) => !isURLInList(props.tab.url, url));
        if (name === defaultPresetName) {
            props.actions.changeSettings({customThemes: filteredCustomThemes});
        } else if (name === customPresetName) {
            const extended = filteredCustomThemes.concat({
                url: [host],
                theme: {...props.data.settings.theme},
            });
            props.actions.changeSettings({customThemes: extended});
        }
    }

    return (
        <div class="m-theme-group">
            <div class="m-theme-group__presets-wrapper">
                <DropDown
                    selected={custom ? customPresetName : defaultPresetName}
                    values={[
                        defaultPresetName,
                        customPresetName,
                    ]}
                    onChange={onPresetChange}
                />
            </div>
            <div class="m-theme-group__controls-wrapper">
                <ThemeControls
                    theme={theme}
                    onChange={setTheme}
                />
            </div>
            <label class="m-theme-group__description">
                Configure theme
            </label>
        </div>
    );
}


