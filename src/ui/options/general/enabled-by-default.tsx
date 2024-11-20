import {m} from 'malevic';
import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';
import {getLocalMessage} from '../../../utils/locales';

export function EnabledByDefault(props: ViewProps): Malevic.Child {
    function onEnabledByDefaultChange(checked: boolean) {
        props.actions.changeSettings({enabledByDefault: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.enabledByDefault}
            label={getLocalMessage('enable_by_default')}
            description={props.data.settings.enabledByDefault ?
                getLocalMessage('enabled_on_all') :
                getLocalMessage('disabled_on_all')}
            onChange={onEnabledByDefaultChange}
        />
    );
}
