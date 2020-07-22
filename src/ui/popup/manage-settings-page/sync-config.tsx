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
            label='Sync config'
            description='Sync to the latest config'
            onChange={syncConfig} />
    );
}
