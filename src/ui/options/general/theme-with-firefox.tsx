import {m} from 'malevic';
import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function ThemeWithFirefox(props: ViewProps): Malevic.Child {
    function onThemeWithFirefoxChange(checked: boolean) {
        props.actions.changeSettings({themeWithFirefox: checked});
        if(checked) {
            props.actions.changeSettings({changeBrowserTheme: false});
        }
    }

    return (
        <CheckButton
            checked={props.data.settings.themeWithFirefox}
            label="Theme with Firefox"
            description={props.data.settings.themeWithFirefox ?
                `Will theme Dark Reader with Firefox theme` :
                `Will not theme Dark Reader with Firefox theme`}
            onChange={onThemeWithFirefoxChange}
        />
    );
}
