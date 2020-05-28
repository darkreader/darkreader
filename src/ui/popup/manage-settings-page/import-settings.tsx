import {m} from 'malevic';
import {ViewProps} from '../types';
import ControlGroup from '../control-group';
import {UserSettings} from '../../../definitions';
import {Button} from '../../controls';
import {openFile} from '../../utils';
import {DEFAULT_SETTINGS} from '../../../defaults';

export default function ImportButton(props: ViewProps) {

    function getValidatedObject(source: any, compare: any) {
        const result = {};
        Object.keys(source).forEach( (key) => {
            const value: string = source[key];
            if (value != null && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = getValidatedObject(value, compare[key]);
            } else if (compare[key] != null && (Array.isArray(value) && Array.isArray(compare[key])) && typeof value === typeof compare[key]) {
                result[key] = value;
            }
        });
        return result;
    }
    
    function importSettings() {
        openFile({extensions: ['json']}, (result: string) => {
            try {
                const content: UserSettings = JSON.parse(result);
                const result2 = getValidatedObject(content, DEFAULT_SETTINGS);
                props.actions.changeSettings({...result2});
            } catch (err) {
                //TODO Make overlay Error
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
