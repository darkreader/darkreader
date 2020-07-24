import {m} from 'malevic';
import {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function InvertPDF(props: ViewProps) {
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
