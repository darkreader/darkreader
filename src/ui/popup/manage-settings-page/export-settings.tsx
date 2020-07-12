import {m} from 'malevic';
import {ViewProps} from '../types';
import {Button} from '../../controls';
import {saveFile} from '../../utils';
import ControlGroup from '../control-group';
import {getLocalMessage} from '../../../utils/locales';

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
                    {getLocalMessage('export_settings')}
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
            {getLocalMessage('save_to_json')}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
