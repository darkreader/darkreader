import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ViewProps} from '../../../definitions';
import {Button, ControlGroup, MessageBox} from '../../controls';
import {DeleteIcon} from '../../icons';
import {getLocalMessage} from '../../../utils/locales';

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
            caption={getLocalMessage('clear_site_list_confirm')}
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
                        {getLocalMessage('clear_site_list')}
                    </span>
                    {dialog}
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                {getLocalMessage('remove_all_sites')}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
