import {m} from 'malevic';
import {Button} from '../../controls';
import ControlGroup from '../control-group';
import {ViewProps} from '../types';
import UserStorage from '../../../background/user-storage';

export default function ResetButton(props: ViewProps) {
    function reset() {
        const defaultconfig = new UserStorage();
        props.actions.changeSettings(defaultconfig.getDefaultSettings());
    }
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Button class="reset-button"
                    onclick={reset}
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