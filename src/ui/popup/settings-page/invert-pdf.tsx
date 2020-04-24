import {m} from 'malevic';
import {ViewProps} from '../types';
import ReverseCheckButton from '../reverse-check-button';

export default function InvertPDF(props: ViewProps) {
    function onInvertPDFChange(checked: boolean) {
        props.actions.changeSettings({invertPDF: !checked});
    }

    return (
        <ReverseCheckButton
            checked={!props.data.settings.invertPDF}
            label="Inverting PDF"
            description={props.data.settings.invertPDF ?
                "Disabled inverting PDF's" :
                "Enabled inverting PDF's" }
            onChange={onInvertPDFChange}
        />
    );
}
