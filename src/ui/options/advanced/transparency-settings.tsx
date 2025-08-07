import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function TransparencySettings(props: ViewProps): Malevic.Child {
    function onTransparencySettingsChange(checked: boolean) {
        props.actions.changeSettings({allowTransparency: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.allowTransparency}
            label="Enable background transparency"
            description={props.data.settings.allowTransparency ?
                'Attempting to use transparency' :
                'Not attempting to use transparency'}
            onChange={onTransparencySettingsChange}
        />
    );
}
