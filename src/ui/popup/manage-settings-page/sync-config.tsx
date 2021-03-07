import {m} from 'malevic';
import type {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function SyncConfigButton(props: ViewProps) {
    function syncConfig(syncSitesFixes: boolean) {
        props.actions.changeSettings({syncSitesFixes});
        props.actions.loadConfig({local: !syncSitesFixes});
    }
    return (
        <CheckButton
            checked={props.data.settings.syncSitesFixes}
            label="Synchronize sites fixes"
            description="Load the latest sites fixes from a remote server"
            onChange={syncConfig} />
    );
}
