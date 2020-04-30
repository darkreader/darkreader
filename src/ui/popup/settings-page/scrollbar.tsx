import {m} from 'malevic';
import {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function ScrollbarTheming(props: ViewProps) {
    function onScrollbarTheming(checked: boolean) {
        props.actions.setTheme({scrollbarColor: checked ? '' : 'auto'});
    }

    return (
        <CheckButton
            checked={props.data.settings.theme.scrollbarColor != ''}
            label='Enable scrollbar theming'
            description={props.data.settings.theme.scrollbarColor != '' ?
                'Enabled scrollbar theming' :
                'Disabled scrollbar theming'}
            onChange={onScrollbarTheming}
        />
    );
}
