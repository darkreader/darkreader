import {m} from 'malevic';
import {NavButton} from '../../controls';
import ControlGroup from '../control-group';

export default function ManageExternalConnectionsButton(props: {onClick: () => void}) {
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <NavButton onClick={props.onClick}>
                    Manage external connections
                </NavButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Connect to external applications and other extensions
            </ControlGroup.Description>
        </ControlGroup>
    );
}
