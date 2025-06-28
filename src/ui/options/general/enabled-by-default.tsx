import {m} from 'malevic';
import {getLocalMessage} from '../../../utils/locales';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function EnabledByDefault(props: ViewProps): Malevic.Child {
    function onEnabledByDefaultChange(checked: boolean) {
        props.actions.changeSettings({enabledByDefault: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.enabledByDefault}
            label={getLocalMessage('enabled_by_default')}
            description={props.data.settings.enabledByDefault ?
                getLocalMessage('enable_for_all_sites_by_default') :
                getLocalMessage('disable_for_all_sites_by_default')}
            onChange={onEnabledByDefaultChange}
        />
    );
}
