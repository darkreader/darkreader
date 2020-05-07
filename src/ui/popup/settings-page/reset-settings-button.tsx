import {m} from 'malevic';
import {DEFAULT_SETTINGS} from '../../../defaults';
import {ResetButton} from '../../controls';
import ControlGroup from '../control-group';
import {ViewProps} from '../types';

export default function ResetButtonGroup(props: ViewProps) {
    function reset() {
        props.actions.changeSettings(DEFAULT_SETTINGS);
    }

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <ResetButton onClick={reset}>
                    Reset settings
                </ResetButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Restore settings to defaults
            </ControlGroup.Description>
        </ControlGroup>
    );
}
