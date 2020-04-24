import {m} from 'malevic';
import {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function InvertPDF(props: ViewProps) {

    function onInvertPDFChange(checked: boolean) {
        props.actions.changeSettings({disableForPDF: !checked});
    }

    return (
        <CheckButton
            checked={!props.data.settings.disableForPDF}
            label='Disable inverting PDF files'
            description={props.data.settings.disableForPDF ?
                'Enabled for PDF files' :
                'Disabled for PDF files' }
            onChange={onInvertPDFChange}
        />
    );
}
