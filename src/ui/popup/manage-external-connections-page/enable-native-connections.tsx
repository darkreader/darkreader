import {m} from 'malevic';
import type {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function EnableNativeConnections(props: ViewProps) {
    function onEnableNativeConnections(checked: boolean) {
        props.actions.changeSettings({enableExternalConnections: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.enableExternalConnections}
            label="Communicate with other extensions"
            description={props.data.settings.enableExternalConnections ?
                'Permit communication with other extensions' :
                'Communication with other extensions is forbidden'}
            onChange={onEnableNativeConnections}
        />
    );
}
