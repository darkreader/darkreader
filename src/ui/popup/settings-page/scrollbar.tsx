import {m} from 'malevic';
import {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function ScrollbarTheming(props: ViewProps) {
    function onScrollbarTheming(checked: boolean) {
        props.actions.changeSettings({scrollbarTheming: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.scrollbarTheming}
            label='Enable scrollbar theming'
            description={props.data.settings.scrollbarTheming ?
                'Enabled scrollbar theming' :
                'Disabled scrollbar theming'}
            onChange={onScrollbarTheming}
        />
    );
}
