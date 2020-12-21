import {m} from 'malevic';
import type {ViewProps} from '../types';
import ControlGroup from '../control-group';
import type {UserSettings} from '../../../definitions';
import {Button} from '../../controls';
import {openFile} from '../../utils';
import {DEFAULT_SETTINGS} from '../../../defaults';
import {getValidatedObject} from '../../../utils/object';

export default function ImportButton(props: ViewProps) {

    function importSettings() {
        openFile({extensions: ['json']}, (result: string) => {
            try {
                const content: UserSettings = JSON.parse(result);
                const result2 = getValidatedObject(content, DEFAULT_SETTINGS);
                props.actions.changeSettings({...result2});
            } catch (err) {
                // TODO Make overlay Error
                console.error(err);
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
