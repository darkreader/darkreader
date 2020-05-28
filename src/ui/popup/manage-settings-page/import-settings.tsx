import {m} from 'malevic';
import {ViewProps} from '../types';
import ControlGroup from '../control-group';
import {UserSettings} from '../../../definitions';
import {Button} from '../../controls';
import {openFile} from '../../utils';

export default function ImportButton(props: ViewProps) {
    function importSettings() {
        openFile({extensions: ['json']}, function (result: string) {
            try {
                const content: UserSettings = JSON.parse(result);
                props.actions.changeSettings({...content});
            } catch {
                // TODO make error
            }
        });
    }

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Button 
                    onclick={importSettings}
                    class="settings-button"
                >
                    Import Settings
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Open settings from a JSON file
            </ControlGroup.Description>
        </ControlGroup>
    );
}
