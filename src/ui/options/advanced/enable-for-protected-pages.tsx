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
                'See the README file on GitHub for details' :
                'Disabled for the Web Store and other pages'}
        />
    );
}
