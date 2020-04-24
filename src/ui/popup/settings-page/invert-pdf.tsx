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
            label="Inverting PDF"
            description={props.data.settings.invertPDF ?
                "Disabled inverting PDF's" :
                "Enabled inverting PDF's" }
            onChange={onInvertPDFChange}
        />
    );
}
