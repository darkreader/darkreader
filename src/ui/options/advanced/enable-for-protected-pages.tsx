import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function EnableForProtectedPages(props: ViewProps): Malevic.Child {
    function onEnableForProtectedPages(value: boolean) {
        props.actions.changeSettings({enableForProtectedPages: value});
    }

    return (
        <CheckButton
            checked={props.data.settings.enableForProtectedPages}
            onChange={onEnableForProtectedPages}
            label={'Enable on restricted pages'}
            description={props.data.settings.enableForProtectedPages ?
                'You should enable it in browser flags too' :
                'Disabled for web store and other pages'}
        />
    );
}
