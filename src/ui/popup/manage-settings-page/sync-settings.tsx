import {m} from 'malevic';
import type {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function SyncSettings(props: ViewProps) {
    function onSyncSettingsChange(checked: boolean) {
        props.actions.changeSettings({syncSettings: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.syncSettings}
            label="Enable settings sync"
            description={props.data.settings.syncSettings ?
                'Synchronized across devices' :
                'Not synchronized across devices'}
            onChange={onSyncSettingsChange}
        />
    );
}
