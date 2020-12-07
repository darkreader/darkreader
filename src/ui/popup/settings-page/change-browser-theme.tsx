import {m} from 'malevic';
import CheckButton from '../check-button';
import type {ViewProps} from '../types';

export default function ChangeBrowserTheme(props: ViewProps) {
    function onBrowserThemeChange(checked: boolean) {
        props.actions.changeSettings({changeBrowserTheme: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.changeBrowserTheme}
            label="Change browser theme"
            description={props.data.settings.changeBrowserTheme ?
                'Custom browser theme is active' :
                'Default browser theme is active'}
            onChange={onBrowserThemeChange}
        />
    );
}
