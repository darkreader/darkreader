import {m} from 'malevic';
import {Button} from '../../controls';
import ControlGroup from '../control-group';

export default function AutomationButton(props: {onClick: () => void}) {
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Button
                    onclick={props.onClick}
                    class='automation-button'
                >
                    Automation
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Configure when app is enabled
            </ControlGroup.Description>
        </ControlGroup>
    );
}
