import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {getLocalMessage} from '../../../utils/locales';
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
                    {getLocalMessage('export_settings')}
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                {getLocalMessage('save_settings_json')}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
