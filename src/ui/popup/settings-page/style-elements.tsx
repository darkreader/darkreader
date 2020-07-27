import {m} from 'malevic';
import {ViewProps} from '../types';
import CheckButton from '../check-button';
import {getCurrentThemePreset} from '../theme/utils';

export default function StyleStandardElements(props: ViewProps) {
    const {change, theme} = getCurrentThemePreset(props);
    function onStyleStandardElements(checked: boolean) {
        change({styleStandardElements: checked});
    }
    return (
        <CheckButton
            checked={theme.styleStandardElements}
            label="Enable to style standard elements"
            description={theme.styleStandardElements ?
                'Enabled to style standard elements' :
                'Disabled to style standard elements'}
            onChange={onStyleStandardElements}
        />
    );
}
