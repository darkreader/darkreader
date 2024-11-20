import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {DEFAULT_SETTINGS} from '../../../defaults';
import type {ViewProps} from '../../../definitions';
import {ControlGroup, MessageBox, ResetButton} from '../../controls';
import {getLocalMessage} from '../../../utils/locales';

export function ResetSettings(props: ViewProps): Malevic.Child {
    const context = getContext();

    function showDialog() {
        context.store.isDialogVisible = true;
        context.refresh();
    }

    function hideDialog() {
        context.store.isDialogVisible = false;
        context.refresh();
    }

    function reset() {
        context.store.isDialogVisible = false;
        props.actions.changeSettings(DEFAULT_SETTINGS);
    }

    const dialog = context.store.isDialogVisible ? (
        <MessageBox
            caption={getLocalMessage('ask_remove_settings')}
            onOK={reset}
            onCancel={hideDialog}
        />
    ) : null;

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <ResetButton onClick={showDialog}>
                    {getLocalMessage('reset_settings')}
                    {dialog}
                </ResetButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                {getLocalMessage('restore_settings')}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
