import {m} from 'malevic';
import CheckButton from '../check-button';
import {ViewProps} from '../types';
import {getLocalMessage} from '../../../utils/locales';

export default function EnabledByDefaultGroup(props: ViewProps) {
    function onEnabledByDefaultChange(checked: boolean) {
        props.actions.changeSettings({applyToListedOnly: !checked});
    }

    return (
        <CheckButton
            checked={!props.data.settings.applyToListedOnly}
            label={getLocalMessage('enable_by_default')}
            description={props.data.settings.applyToListedOnly ?
                getLocalMessage('disabled_by_default') :
                getLocalMessage('enabled_by_default')}
            onChange={onEnabledByDefaultChange}
        />
    );
}
