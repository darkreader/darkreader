import {m} from 'malevic';
import type {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function EnableExternalConnections(props: ViewProps) {
    function onEnableExternalConnections(checked: boolean) {
        props.actions.changeSettings({enableExternalConnections: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.enableExternalConnections}
            label="Enable external connections"
            description={props.data.settings.enableExternalConnections ?
                'Enabled to receive external connections' :
                'Disabled to receive external connections'}
            onChange={onEnableExternalConnections}
        />
    );
}
