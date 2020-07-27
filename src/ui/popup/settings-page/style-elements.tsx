import {m} from 'malevic';
import {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function StyleStandardElements(props: ViewProps) {
    function onStyleStandardElements(checked: boolean) {
        props.actions.changeSettings({styleStandardElements: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.styleStandardElements}
            label="Enable to style standard elements"
            description={props.data.settings.styleStandardElements ?
                'Enabled to style standard elements' :
                'Disabled to style standard elements'}
            onChange={onStyleStandardElements}
        />
    );
}
