import {m} from 'malevic';
import {DEFAULT_SETTINGS} from '../../../../defaults';
import {Button} from '../../../controls';
import ControlGroup from '../../control-group';
import {ViewProps} from '../../types';

export default function ResetButton(props: ViewProps) {
    function reset() {
        props.actions.setTheme(DEFAULT_SETTINGS.theme);
    }

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Button
                    class="reset-button"
                    onclick={reset}
                    style="width: 100%"
                >
                    Reset
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Reset all theme values
            </ControlGroup.Description>
        </ControlGroup>
    );
}
