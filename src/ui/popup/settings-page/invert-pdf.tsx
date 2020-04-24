import {m} from 'malevic';
import {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function InvertPDF(props: ViewProps) {

    function onInvertPDFChange(checked: boolean) {
        props.actions.changeSettings({enableForPDF: checked});
    }

    return (
        <CheckButton
            checked={!props.data.settings.enableForPDF}
            label='Enabled inverting PDF files'
            description={props.data.settings.enableForPDF ?
                'Enabled for PDF files' :
                'Disabled for PDF files' }
            onChange={onInvertPDFChange}
        />
    );
}
