import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import {DEFAULT_SETTINGS} from '../../../defaults';
import type {ViewProps} from '../../../definitions';
import {getLocalMessage} from '../../../utils/locales';
import {ControlGroup, MessageBox, ResetButton} from '../../controls';

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
            caption={getLocalMessage('reset_settings_confirm')}
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
                {getLocalMessage('restore_settings_defaults')}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
