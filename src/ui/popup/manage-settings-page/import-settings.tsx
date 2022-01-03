import {m} from 'malevic';
import type {ViewProps} from '../types';
import ControlGroup from '../control-group';
import type {UserSettings} from '../../../definitions';
import {Button, MessageBox} from '../../controls';
import {openFile} from '../../utils';
import {DEFAULT_SETTINGS} from '../../../defaults';
import {getContext} from 'malevic/dom';

export default function ImportButton(props: ViewProps) {
    const context = getContext();
    function getValidatedObject<T>(source: T, compare: T): T {
        const result = {} as T;
        if (source == null || typeof source !== 'object' || Array.isArray(source)) {
            return null;
        }
        Object.keys(source).forEach((key: Extract<keyof T, string>) => {
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

    function showDialog() {
        context.store.isDialogVisible = true;
        context.refresh();
    }

    function hideDialog() {
        context.store.isDialogVisible = false;
        context.refresh();
    }

    const dialog = context && context.store.isDialogVisible ? (
        <MessageBox
            caption="The given file has incorrect JSON."
            onOK={hideDialog}
            onCancel={hideDialog}
        />
    ) : null;

    function importSettings() {
        openFile({extensions: ['json']}, (result: string) => {
            try {
                const content: UserSettings = JSON.parse(result);
                const result2 = getValidatedObject<UserSettings>(content, DEFAULT_SETTINGS);
                props.actions.changeSettings({...result2});
            } catch (err) {
                console.error(err);
                showDialog();
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
                    {dialog}
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Open settings from a JSON file
            </ControlGroup.Description>
        </ControlGroup>
    );
}
