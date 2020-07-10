import {m} from 'malevic';
import {NavButton} from '../../controls';
import ControlGroup from '../control-group';

export default function FontSettingsButton(props: {onClick: () => void}) {
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <NavButton onClick={props.onClick}>
                    Font settings
                </NavButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Resize, change font-family/textStroke.
            </ControlGroup.Description>
        </ControlGroup>
    );
}
