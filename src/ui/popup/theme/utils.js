// @ts-check
import {isURLInList} from '../../../utils/url';

/** @typedef {import('../types').ViewProps} ViewProps */
/** @typedef {import('../../../definitions').Theme} Theme */

/**
 * @param {ViewProps} props
 * @returns {{theme: Theme; change: (theme: Partial<Theme>) => void}}
 */
export function getCurrentThemePreset(props) {
    const custom = props.data.settings.customThemes.find(
        ({url}) => isURLInList(props.tab.url, url)
    );
    const preset = custom ? null : props.data.settings.presets.find(
        ({urls}) => isURLInList(props.tab.url, urls)
    );
    const theme = custom ?
        custom.theme :
        preset ?
            preset.theme :
            props.data.settings.theme;

    /**
     * @param {Partial<Theme>} config 
     */
    function setTheme(config) {
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
    }

    return {
        theme,
        change: setTheme,
    };
}
