import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {DEFAULT_SETTINGS} from '../../../defaults';
import {MessageBox, ResetButton} from '../../controls';
import ControlGroup from '../control-group';
import {ViewProps} from '../types';
import {getLocalMessage} from '../../../utils/locales';

export default function ResetButtonGroup(props: ViewProps) {
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
            caption={getLocalMessage('reset_warning')}
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
                {getLocalMessage('restore_to_default')}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
