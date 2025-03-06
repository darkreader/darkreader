import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function EnabledByDefault(props: ViewProps): Malevic.Child {
    function onEnabledByDefaultChange(checked: boolean) {
        props.actions.changeSettings({enabledByDefault: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.enabledByDefault}
            label="Enable by default"
            description={props.data.settings.enabledByDefault ?
                'Enabled on all websites by default' :
                'Disabled on all websites by default'}
            onChange={onEnabledByDefaultChange}
        />
    );
}
