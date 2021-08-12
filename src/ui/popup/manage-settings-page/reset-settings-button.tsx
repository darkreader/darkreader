import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {DEFAULT_SETTINGS} from '../../../defaults';
import {MessageBox, ResetButton} from '../../controls';
import ControlGroup from '../control-group';
import type {ViewProps} from '../types';

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
            caption="Are you sure you want to remove all your settings? You cannot restore them later"
            onOK={reset}
            onCancel={hideDialog}
        />
    ) : null;

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <ResetButton onClick={showDialog}>
                    Reset settings
                    {dialog}
                </ResetButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Restore settings to defaults
            </ControlGroup.Description>
        </ControlGroup>
    );
}
