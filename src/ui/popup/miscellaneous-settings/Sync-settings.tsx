import {m} from 'malevic';
import {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function SyncSettings(props: ViewProps) {
    function onSyncSettingsChange(checked: boolean) {
        props.actions.changeSettings({syncSettings: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.syncSettings}
            label="Enable syncing settings"
            description={props.data.settings.syncSettings ?
                'Enabled to sync settings' :
                'Disabled to sync settings'}
            onChange={onSyncSettingsChange}
        />
    );
}
