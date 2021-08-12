import {m} from 'malevic';
import type {ViewProps} from '../types';
import {Button} from '../../controls';
import {saveFile} from '../../utils';
import ControlGroup from '../control-group';

export default function ExportButton(props: ViewProps) {
    function exportSettings() {
        saveFile('Dark-Reader-Settings.json', JSON.stringify(props.data.settings, null, 4));
    }
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Button
                    onclick={exportSettings}
                    class="settings-button"
                >
                    Export Settings
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Save settings to a JSON file
            </ControlGroup.Description>
        </ControlGroup>
    );
}
