import {m} from 'malevic';
import {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function InvertPDF(props: ViewProps) {

    function onInvertPDFChange(checked: boolean) {
        props.actions.changeSettings({invertPDF: !checked});
    }

    return (
        <CheckButton
            checked={!props.data.settings.invertPDF}
            label='Enabled inverting PDF files'
            description={props.data.settings.invertPDF ?
                'Enabled for PDF files' :
                'Disabled for PDF files' }
            onChange={onInvertPDFChange}
        />
    );
}
