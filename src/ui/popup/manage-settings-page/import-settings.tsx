import {m} from 'malevic';
import type {ViewProps} from '../types';
import ControlGroup from '../control-group';
import type {UserSettings} from '../../../definitions';
import {Button} from '../../controls';
import {openFile} from '../../utils';
import {DEFAULT_SETTINGS} from '../../../defaults';

export default function ImportButton(props: ViewProps) {
    function getValidatedObject<T>(source: T, compare: T): Partial<T> {
        const result = {} as Partial<T>;
        if (source == null || typeof source !== 'object' || Array.isArray(source)) {
            return null;
        }
        Object.keys(source).forEach((key) => {
            const value = source[key as keyof T];
            if (value == null || compare[key as keyof T] == null) {
                return;
            }
            const array1 = Array.isArray(value);
            const array2 = Array.isArray(compare[key as keyof T]);
            if (array1 || array2) {
                if (array1 && array2) {
                    result[key as keyof T] = value;
                }
            } else if (typeof value === 'object' && typeof compare[key as keyof T] === 'object') {
                // TODO: this any is ugly
                result[key as keyof T] = getValidatedObject(value, compare[key as keyof T]) as any;
            } else if (typeof value === typeof compare[key as keyof T]) {
                result[key as keyof T] = value;
            }
        });
        return result;
    }

    function importSettings() {
        openFile({extensions: ['json']}, (result: string) => {
            try {
                const content: UserSettings = JSON.parse(result);
                const result2 = getValidatedObject<UserSettings>(content, DEFAULT_SETTINGS);
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
