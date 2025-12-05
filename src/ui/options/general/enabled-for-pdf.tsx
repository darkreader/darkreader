import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function EnableForPDF(props: ViewProps): Malevic.Child {
    function onInvertPDFChange(checked: boolean) {
        props.actions.changeSettings({enableForPDF: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.enableForPDF}
            label="Enable for PDF files"
            description={props.data.settings.enableForPDF ?
                'Enabled for PDF documents' :
                'Disabled for PDF documents'}
            onChange={onInvertPDFChange}
        />
    );
}
