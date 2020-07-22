import {m} from 'malevic';
import {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function SyncConfigButton(props: ViewProps) {
    function syncConfig() {
        if (!props.data.settings.syncSitesFixes) {
            props.actions.changeSettings({syncSitesFixes: true})
            props.actions.loadConfig({local: false});
        }
    }
    return (
        <CheckButton
            checked={props.data.settings.syncSitesFixes}
            label='Synchronize sites fixes'
            description='Load the latest sites fixes from a remote server'
            onChange={syncConfig} />
    );
}
