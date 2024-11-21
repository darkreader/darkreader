import {m} from 'malevic';
import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';
import {getLocalMessage} from '../../../utils/locales';

export function ChangeBrowserTheme(props: ViewProps): Malevic.Child {
    function onBrowserThemeChange(checked: boolean) {
        props.actions.changeSettings({changeBrowserTheme: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.changeBrowserTheme}
            label={getLocalMessage('change_browser_theme')}
            description={props.data.settings.changeBrowserTheme ?
                getLocalMessage('custom_browser_theme') :
                getLocalMessage('default_browser_theme')}
            onChange={onBrowserThemeChange}
        />
    );
}
