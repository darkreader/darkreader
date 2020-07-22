import {m} from 'malevic';
import {ViewProps} from '../types';
import CheckButton from '../check-button';

let synced = false;
export default function SyncConfigButton(props: ViewProps) {
    function syncConfig() {
        if (!synced) {
            synced = true;
            props.actions.loadConfig({local: false});
        }
    }
    return (
        <CheckButton
            checked={synced}
            label='Synchronize sites fixes'
            description='Load the latest sites fixes from a remote server'
            onChange={syncConfig} />
    );
}
