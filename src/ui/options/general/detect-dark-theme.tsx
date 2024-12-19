import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function DetectDarkTheme(props: ViewProps): Malevic.Child {
    function onDetectDarkThemeChange(checked: boolean) {
        props.actions.changeSettings({detectDarkTheme: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.detectDarkTheme}
            label="Detect dark theme"
            description={props.data.settings.detectDarkTheme ?
                `Will not override website's dark theme` :
                `Will override website's dark theme`}
            onChange={onDetectDarkThemeChange}
        />
    );
}
