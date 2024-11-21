import {m} from 'malevic';
import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';
import {getLocalMessage} from '../../../utils/locales';

export function SyncConfig(props: ViewProps): Malevic.Child {
    function syncConfig(syncSitesFixes: boolean) {
        props.actions.changeSettings({syncSitesFixes});
        props.actions.loadConfig({local: !syncSitesFixes});
    }

    return (
        <CheckButton
            checked={props.data.settings.syncSitesFixes}
            label={getLocalMessage('synchronize_sites')}
            description={getLocalMessage('synchronize_sites_description')}
            onChange={syncConfig} />
    );
}
