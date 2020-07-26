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
            description={
                getLocalMessage(props.data.settings.applyToListedOnly ?
                    'disabled_on_all_websites_by_default' :
                    'enabled_on_all_websites_by_default'
                )}
            onChange={onEnabledByDefaultChange}
        />
    );
}
