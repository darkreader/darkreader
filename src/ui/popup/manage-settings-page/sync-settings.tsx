import {m} from 'malevic';
import {ViewProps} from '../types';
import CheckButton from '../check-button';
import {getLocalMessage} from '../../../utils/locales';

export default function SyncSettings(props: ViewProps) {
    function onSyncSettingsChange(checked: boolean) {
        props.actions.changeSettings({syncSettings: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.syncSettings}
            label={getLocalMessage('enable_sync')}
            description={props.data.settings.syncSettings ?
                getLocalMessage('synchronized') :
                getLocalMessage('not_synchronized')}
            onChange={onSyncSettingsChange}
        />
    );
}
