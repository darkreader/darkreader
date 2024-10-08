import {m} from 'malevic';
import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function UseFirefoxTheme(props: ViewProps): Malevic.Child {
    function onUseFirefoxThemeChange(checked: boolean) {
        props.actions.changeSettings({useFirefoxTheme: checked});
        if (checked) {
            props.actions.changeSettings({changeBrowserTheme: false});
        }
    }

    return (
        <CheckButton
            checked={props.data.settings.useFirefoxTheme}
            label="Use Firefox theme"
            description={props.data.settings.useFirefoxTheme ?
                'Use Firefox UI colors for Dark Reader UI' :
                'Do not use Firefox UI colors for Dark Reader UI'}
            onChange={onUseFirefoxThemeChange}
        />
    );
}
