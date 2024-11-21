import {m} from 'malevic';
import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';
import {getLocalMessage} from '../../../utils/locales';

export function DetectDarkTheme(props: ViewProps): Malevic.Child {
    function onDetectDarkThemeChange(checked: boolean) {
        props.actions.changeSettings({detectDarkTheme: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.detectDarkTheme}
            label={getLocalMessage('detect_dark_theme')}
            description={props.data.settings.detectDarkTheme ?
                getLocalMessage('not_override_dark_theme') :
                getLocalMessage('override_dark_theme')}
            onChange={onDetectDarkThemeChange}
        />
    );
}
