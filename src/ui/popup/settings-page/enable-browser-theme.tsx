import {m} from 'malevic';
import CheckButton from '../check-button';
import {ViewProps} from '../types';

export default function EnableCustomBrowserTheme(props: ViewProps) {
    function onEnableCustomBrowserTheme(checked: boolean) {
        props.actions.changeSettings({changeBrowserTheme: !checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.changeBrowserTheme}
            label="Enable custom browser theme"
            description={props.data.settings.changeBrowserTheme ?
                'Custom browser theme active' :
                'Default browser theme active'}
            onChange={onEnableCustomBrowserTheme}
        />
    );
}
