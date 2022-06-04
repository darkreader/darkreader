import type {Theme} from '../../../definitions';
import {isURLInList} from '../../../utils/url';
import type {ViewProps} from '../types';

export function getCurrentThemePreset(props: ViewProps) {
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
            props.data.settings.automation &&
            props.data.settings.automationBehaviour === 'Scheme'
        ) {
            props.actions.changeSettings({
                automation: '',
            });
        }
    }

    return {
        theme,
        change: setTheme,
    };
}
