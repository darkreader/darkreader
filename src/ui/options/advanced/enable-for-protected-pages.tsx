import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';
import {getLocalMessage} from '../../../utils/locales';

export function EnableForProtectedPages(props: ViewProps): Malevic.Child {
    function onEnableForProtectedPages(value: boolean) {
        props.actions.changeSettings({enableForProtectedPages: value});
    }

    return (
        <CheckButton
            checked={props.data.settings.enableForProtectedPages}
            onChange={onEnableForProtectedPages}
            label={getLocalMessage('enable_on_restricted_pages')}
            description={props.data.settings.enableForProtectedPages ?
                getLocalMessage('enable_on_restricted_pages') :
                getLocalMessage('disabled_for_web_store')}
        />
    );
}
