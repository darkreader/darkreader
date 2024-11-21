import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function ChangeBrowserTheme(props: ViewProps): Malevic.Child {
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
