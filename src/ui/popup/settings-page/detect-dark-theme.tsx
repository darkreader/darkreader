import { m } from 'malevic';
import CheckButton from '../check-button';
import type { ViewProps } from '../types';

export default function DetectDarkTheme(props: ViewProps) {
    function onDetectDarkThemeChange(checked: boolean) {
        props.actions.changeSettings({ detectDarkTheme: checked });
    }

    return (
        <CheckButton
            checked={props.data.settings.detectDarkTheme}
            label='Detect dark theme'
            description={
                props.data.settings.detectDarkTheme
                    ? `Will not override website's dark theme`
                    : `Will override website's dark theme`
            }
            onChange={onDetectDarkThemeChange}
        />
    );
}
