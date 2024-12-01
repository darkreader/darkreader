import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function SyncSettings(props: ViewProps): Malevic.Child {
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
