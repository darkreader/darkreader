import {m} from 'malevic';
import type {ViewProps} from '../types';
import ControlGroup from '../control-group';
import type {UserSettings} from '../../../definitions';
import {Button} from '../../controls';
import {openFile} from '../../utils';
import {DEFAULT_SETTINGS} from '../../../defaults';

export default function ImportButton(props: ViewProps) {
    function getValidatedObject<T>(source: any, compare: T): Partial<T> {
        const result = {};
        if (source == null || typeof source !== 'object' || Array.isArray(source)) {
            return null;
        }
        Object.keys(source).forEach((key) => {
            const value = source[key];
            if (value == null || compare[key] == null) {
                return;
            }
            const array1 = Array.isArray(value);
            const array2 = Array.isArray(compare[key]);
            if (array1 || array2) {
                if (array1 && array2) {
                    result[key] = value;
                }
            } else if (typeof value === 'object' && typeof compare[key] === 'object') {
                result[key] = getValidatedObject(value, compare[key]);
            } else if (typeof value === typeof compare[key]) {
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
