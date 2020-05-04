import {Theme} from '../../../definitions';
import {isURLInList} from '../../../utils/url';
import {ViewProps} from '../types';

export function getCurrentThemePreset(props: ViewProps) {
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

    return {
        theme,
        change: setTheme,
    };
}
