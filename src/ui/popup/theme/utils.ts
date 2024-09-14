import type {Theme, ViewProps} from '../../../definitions';
import {isURLInList} from '../../../utils/url';

interface ThemePresets {
    theme: Theme;
    change: (config: Partial<Theme>) => void;
}

export function getCurrentThemePreset(props: ViewProps): ThemePresets {
    const custom = props.data.settings.customThemes.find(
        ({url}) => isURLInList(props.data.activeTab.url, url)
    );
    const preset = custom ? null : props.data.settings.presets.find(
        ({urls}) => isURLInList(props.data.activeTab.url, urls)
    );
    let theme = custom ?
        custom.theme :
        preset ?
            preset.theme :
            props.data.settings.theme;
    if (props.data.forcedScheme) {
        const mode = props.data.forcedScheme === 'dark' ? 1 : 0;
        theme = {...theme, mode};
    }

    function setTheme(config: Partial<Theme>) {
        if (custom) {
            custom.theme = {...custom.theme, ...config};
            props.actions.changeSettings({
                customThemes: props.data.settings.customThemes,
            });
        } else if (preset) {
            preset.theme = {...preset.theme, ...config};
            props.actions.changeSettings({
                presets: props.data.settings.presets,
            });
        } else {
            props.actions.setTheme(config);
        }
        if (
            config.mode != null &&
            props.data.settings.automation.behavior === 'Scheme'
        ) {
            props.actions.changeSettings({
                automation: {...props.data.settings.automation, ...{enabled: false}},
            });
        }
    }

    return {
        theme,
        change: setTheme,
    };
}
