import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ViewProps} from '../../../definitions';
import {Button, ControlGroup, MessageBox} from '../../controls';
import {DeleteIcon} from '../../icons';

export function ClearSiteList(props: ViewProps): Malevic.Child {
    const context = getContext();
    const store = context.getStore({isDialogVisible: false});

    function showDialog() {
        store.isDialogVisible = true;
        context.refresh();
    }

    function hideDialog() {
        store.isDialogVisible = false;
        context.refresh();
    }

    function reset() {
        store.isDialogVisible = false;
        props.actions.changeSettings({enabledFor: [], disabledFor: []});
    }

    const dialog = store.isDialogVisible ? (
        <MessageBox
            caption="Are you sure you want to remove all your sites from the list? You cannot restore them later"
            onOK={reset}
            onCancel={hideDialog}
        />
    ) : null;

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Button onclick={showDialog} class="clear-site-list-button">
                    <span class="clear-site-list-button__content">
                        <span class="clear-site-list-button__icon">
                            <DeleteIcon />
                        </span>
                        Clear site list
                    </span>
                    {dialog}
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Remove all sites from the list
            </ControlGroup.Description>
        </ControlGroup>
    );
}
