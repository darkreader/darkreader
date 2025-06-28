import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';
import {getLocalMessage} from '../../../utils/locales';

export function SyncSettings(props: ViewProps): Malevic.Child {
    function onSyncSettingsChange(checked: boolean) {
        props.actions.changeSettings({syncSettings: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.syncSettings}
            label={getLocalMessage('enable_settings_sync')}
            description={props.data.settings.syncSettings ?
                getLocalMessage('synchronized_across_devices') :
                getLocalMessage('synchronized_across_devices')}
            onChange={onSyncSettingsChange}
        />
    );
}
