import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {Button, ControlGroup} from '../../controls';
import {saveFile} from '../../utils';

export function ExportSettings(props: ViewProps): Malevic.Child {
    function exportSettings() {
        saveFile('Dark-Reader-Settings.json', JSON.stringify(props.data.settings, null, 4));
    }

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Button
                    onclick={exportSettings}
                    class="advanced__export-settings-button"
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
