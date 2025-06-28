import {m} from 'malevic';
import {getLocalMessage} from '../../../utils/locales';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function EnableForPDF(props: ViewProps): Malevic.Child {
    function onInvertPDFChange(checked: boolean) {
        props.actions.changeSettings({enableForPDF: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.enableForPDF}
            label={getLocalMessage('enable_for_pdf_files')}
            description={props.data.settings.enableForPDF ?
                getLocalMessage('enabled_for_pdf_documents') :
                getLocalMessage('disabled_for_pdf_documents')}
            onChange={onInvertPDFChange}
        />
    );
}
