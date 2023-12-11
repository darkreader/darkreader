import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import DeleteAllButton from '../../controls/delete-all-button';
import {ControlGroup, MessageBox} from '../../controls';
import type {ViewProps} from '../../../definitions';

export function ClearSiteList(props: ViewProps): Malevic.Child {
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
        props.actions.changeSettings({enabledFor: [], disabledFor: []});
    }

    const dialog = context.store.isDialogVisible ? (
        <MessageBox
            caption="Are you sure you want to remove all your sites from the list? You cannot restore them later"
            onOK={reset}
            onCancel={hideDialog}
        />
    ) : null;

    return (
        <ControlGroup class="delete-all-icon-group">
            <ControlGroup.Control>
                <DeleteAllButton onClick={showDialog}>
                    {dialog}
                </DeleteAllButton>
            </ControlGroup.Control>
        </ControlGroup>
    );
}
