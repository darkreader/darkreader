import {m} from 'malevic';
import {Button} from '../../controls';
import ControlGroup from '../control-group';
import {ViewProps} from '../types';
import {DEFAULT_SETTINGS} from '../../../background/user-storage';

export default function ResetButton(props: ViewProps) {
    function reset() {
        props.actions.changeSettings(DEFAULT_SETTINGS);
    }

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Button
                    class="reset-button"
                    onclick={reset}
                    style='width: 100%'
                >
                    Reset
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Reset all settings to default
            </ControlGroup.Description>
        </ControlGroup>
    );
}
