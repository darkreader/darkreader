import {m} from 'malevic';
import {DEFAULT_SETTINGS} from '../../../../defaults';
import {ResetButton} from '../../../controls';
import ControlGroup from '../../control-group';
import {ViewProps} from '../../types';
import {getLocalMessage} from '../../../../utils/locales';

export default function ResetButtonGroup(props: ViewProps) {
    function reset() {
        props.actions.setTheme(DEFAULT_SETTINGS.theme);
    }

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <ResetButton onClick={reset}>
                    {getLocalMessage('restore_to_default')}
                </ResetButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                {getLocalMessage('restore_current_theme')}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
