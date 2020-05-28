import {m} from 'malevic';
import {ViewProps} from '../types';
import ControlGroup from '../control-group';
import {UserSettings} from '../../../definitions';
import {Button} from '../../controls';
import {openFile} from '../../utils';
import {DEFAULT_SETTINGS} from '../../../defaults';

export default function ImportButton(props: ViewProps) {

    function flatten(source: any) {
        const result = {};
        (function flat(obj, stack) {
            Object.keys(obj).forEach(function (k) {
                const s = stack.concat([k]);
                const v = obj[k];
                if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
                    flat(v, s);
                } else {
                    result[s.join('.')] = v;
                }
            });
        })(source, []);
        return result;
    }

    function validate(source: any, compareObject: any) {
        const result = {};
        (function flat(obj, stack) {
            Object.keys(obj).forEach(function (k) {
                const s = stack.concat([k]);
                const v = obj[k];
                if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
                    flat(v, s);
                } else {
                    if (compareObject[s.join('.')] !== null && compareObject[s.join('.')] !== undefined) {
                        result[k] = v;
                    }
                }
            });
        })(source, []);
        return result;
    }
    function importSettings() {
        openFile({extensions: ['json']}, function (result: string) {
            try {
                const content: UserSettings = JSON.parse(result);
                const result2 = validate(content, flatten(DEFAULT_SETTINGS));
                props.actions.changeSettings({...result2});
            } catch (err) {
                console.log(err);
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
