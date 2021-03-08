import {m} from 'malevic';
import CheckButton from '../check-button';
import type {ViewProps} from '../types';

export default function EnabledByDefaultGroup(props: ViewProps) {
    function onEnabledByDefaultChange(checked: boolean) {
        props.actions.changeSettings({applyToListedOnly: !checked});
    }

    return (
        <CheckButton
            checked={!props.data.settings.applyToListedOnly}
            label="Enable by default"
            description={props.data.settings.applyToListedOnly ?
                'Disabled on all websites by default' :
                'Enabled on all websites by default'}
            onChange={onEnabledByDefaultChange}
        />
    );
}
