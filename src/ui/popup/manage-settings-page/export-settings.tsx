import {m} from 'malevic';
import {ViewProps} from '../types';
import {Button} from '../../controls';
import {saveFile} from '../../utils';
import ControlGroup from '../control-group';

export default function ExportButton(props: ViewProps) {
    async function exportSettings() {
        const contents = JSON.stringify(props.data.settings, null, 4);
        saveFile('Dark-Reader-Settings.json', contents);
        try { //Chrome v66 & Firefox v63
            await navigator.clipboard.writeText(contents);
        } catch (err) {
            console.log(err);
        }
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
                Save settings to a JSON file/Clipboard
            </ControlGroup.Description>
        </ControlGroup>
    );
}
