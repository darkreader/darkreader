import {m} from 'malevic';
import {getLocalMessage} from '../../../utils/locales';

import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';

export function DetectDarkTheme(props: ViewProps): Malevic.Child {
    function onDetectDarkThemeChange(checked: boolean) {
        props.actions.changeSettings({detectDarkTheme: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.detectDarkTheme}
            label={getLocalMessage('detect_dark_theme')}
            description={props.data.settings.detectDarkTheme ?
                getLocalMessage('will_not_override_website_dark_theme') :
                getLocalMessage('will_override_website_dark_theme')}
            onChange={onDetectDarkThemeChange}
        />
    );
}
