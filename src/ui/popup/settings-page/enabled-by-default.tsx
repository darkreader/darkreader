import {m} from 'malevic';
import CheckButton from '../check-button';
import type {ViewProps} from '../types';

export default function EnabledByDefaultGroup(props: ViewProps) {
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
