import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function TransparencySettings(props: ViewProps): Malevic.Child {
    function onTransparencySettingsChange(checked: boolean) {
        props.actions.setTheme({allowTransparency: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.theme.allowTransparency}
            label="Enable background transparency"
            description={props.data.settings.theme.allowTransparency ?
                'Attempting to use transparency' :
                'Not attempting to use transparency'}
            onChange={onTransparencySettingsChange}
        />
    );
}
