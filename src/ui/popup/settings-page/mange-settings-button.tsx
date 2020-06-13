import {m} from 'malevic';
import {NavButton} from '../../controls';
import ControlGroup from '../control-group';

export default function ManageSettingsButton(props: {onClick: () => void}) {
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <NavButton onClick={props.onClick}>
                    Manage settings
                </NavButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Reset, export or import settings
            </ControlGroup.Description>
        </ControlGroup>
    );
}
