import { m } from 'malevic';
import type { ViewProps } from '../types';
import ControlGroup from '../control-group';
import type { UserSettings } from '../../../definitions';
import { Button, MessageBox } from '../../controls';
import { openFile } from '../../utils';
import { getContext } from 'malevic/dom';
import { validateSettings } from '../../../utils/validation';

export default function ImportButton(props: ViewProps) {
    const context = getContext();

    function showDialog(caption: string) {
        context.store.caption = caption;
        context.store.isDialogVisible = true;
        context.refresh();
    }

    function hideDialog() {
        context.store.isDialogVisible = false;
        context.refresh();
    }

    const dialog =
        context && context.store.isDialogVisible ? (
            <MessageBox
                caption={context.store.caption}
                onOK={hideDialog}
                onCancel={hideDialog}
                hideCancel={true}
            />
        ) : null;

    function importSettings() {
        openFile({ extensions: ['json'] }, (result: string) => {
            try {
                const content: UserSettings = JSON.parse(result);
                const { settings, errors } = validateSettings(content);
                const count = errors.length;
                if (count) {
                    console.error(
                        'Could not validate imported settings',
                        errors,
                        result,
                        content,
                    );
                    showDialog(
                        `The given file has incorrect JSON: ${
                            count > 1
                                ? `${count} errors, including ${errors[0]}`
                                : errors[0]
                        }`,
                    );
                    return;
                }
                props.actions.changeSettings(settings);
                showDialog('Settings imported');
            } catch (err) {
                console.error(err);
                showDialog('Failed to read file');
            }
        });
    }

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Button onclick={importSettings} class='settings-button'>
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
