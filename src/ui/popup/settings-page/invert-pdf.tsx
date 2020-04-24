import {m} from 'malevic';
import CheckButton from '../check-button';
import {ViewProps} from '../types';

export default function InvertPDF(props: ViewProps) {
    function onInvertPDFChange(checked: boolean) {
        props.actions.changeSettings({applyToListedOnly: !checked});
    }

    return (
        <CheckButton
            checked={!props.data.settings.invertPDF}
            label="Invert PDF"
            description={props.data.settings.invertPDF ?
                "Disable inverting PDF's" :
                "Enable inverting PDF's" }
            onChange={onInvertPDFChange}
        />
    );
}
