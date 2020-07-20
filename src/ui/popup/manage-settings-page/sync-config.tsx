import {m} from 'malevic';
import {ViewProps} from '../types';
import {Button} from '../../controls';
import ControlGroup from '../control-group';

export default function SyncConfigButton(props: ViewProps) {
    function syncConfig() {
        props.actions.loadConfig(false);
    }
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Button
                    onclick={syncConfig}
                    class="settings-button"
                >
                    Sync config
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Sync to the latest config
            </ControlGroup.Description>
        </ControlGroup>
    );
}
