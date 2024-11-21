import {m} from 'malevic';
import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';
import { getLocalMessage} from '../../../utils/locales';

export function EnableForPDF(props: ViewProps): Malevic.Child {
    function onInvertPDFChange(checked: boolean) {
        props.actions.changeSettings({enableForPDF: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.enableForPDF}
            label={getLocalMessage('enable_for_pdf')}
            description={props.data.settings.enableForPDF ?
                getLocalMessage('enabled_for_pdf'):
                getLocalMessage('disabled_for_pdf')}
            onChange={onInvertPDFChange}
        />
    );
}
