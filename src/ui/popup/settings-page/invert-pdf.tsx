import {m} from 'malevic';
import {ViewProps} from '../types';
import CheckButton from '../check-button';
import {getLocalMessage} from '../../../utils/locales';

export default function InvertPDF(props: ViewProps) {
    function onInvertPDFChange(checked: boolean) {
        props.actions.changeSettings({enableForPDF: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.enableForPDF}
            label={getLocalMessage('enable_pdf')}
            description={props.data.settings.enableForPDF ?
                getLocalMessage('pdf_enabled') :
                getLocalMessage('pdf_disabled') }
            onChange={onInvertPDFChange}
        />
    );
}
