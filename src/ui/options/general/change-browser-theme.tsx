import {m} from 'malevic';
import {getLocalMessage} from '../../../utils/locales';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function ChangeBrowserTheme(props: ViewProps): Malevic.Child {
    function onBrowserThemeChange(checked: boolean) {
        props.actions.changeSettings({changeBrowserTheme: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.changeBrowserTheme}
            label={getLocalMessage('change_browser_theme')}
            description={props.data.settings.changeBrowserTheme ?
                getLocalMessage('custom_browser_theme_active') :
                getLocalMessage('default_browser_theme_active')}
            onChange={onBrowserThemeChange}
        />
    );
}
