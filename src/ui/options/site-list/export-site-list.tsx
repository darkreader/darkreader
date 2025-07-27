import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ViewProps} from '../../../definitions';
import {Button, ControlGroup, MessageBox} from '../../controls';
import {DeleteIcon} from '../../icons';

// Mostly copied out of clear-site-list.tsx

export function ExportSiteList(props: ViewProps): Malevic.Child {
    const {settings} = props.data;
    const {enabledByDefault} = settings;

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


    function exportSites() {
        const exportList = () => {
            store.isDialogVisible = false;

            const sites = enabledByDefault
                ? settings.disabledFor
                : settings.enabledFor;

            // This works!
            // TODO Figure out how to reformat this:
            // Change from '["https://google.com","https://google.com/maps","https://google.com/drive"]'
            // To https://google.com \n https://google.com/maps, \n https://google.com/drive
            // Use a new line after each one.
            const fileData = JSON.stringify(sites);

            // https://stackoverflow.com/questions/11233498/json-stringify-without-quotes-on-properties
            // This should remove the quotes, well this didn't work
            // const unquotedFileData = fileData.replace(/"([^"]+)":/g, '');
            // const blob = new Blob([unquotedFileData], {type: 'text/plain'});
            const blob = new Blob([fileData], {type: 'text/plain'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'list.txt';
            link.href = url;
            link.click();
        };

        exportList();
    }

    const dialog = store.isDialogVisible ? (
        <MessageBox
            caption="Are you sure you want to export all of your sites from the list? Saves to list.txt"
            onOK={exportSites}
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
                        Export Site list
                    </span>
                    {dialog}
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Export all sites from the list
            </ControlGroup.Description>
        </ControlGroup>
    );
}
