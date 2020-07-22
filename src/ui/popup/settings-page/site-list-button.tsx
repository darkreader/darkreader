import {m} from 'malevic';
import {NavButton} from '../../controls';
import ControlGroup from '../control-group';

export default function SiteListButton(props: {onClick: () => void}) {
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <NavButton onClick={props.onClick}>
                    Site list
                </NavButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Enable or disable on listed websites
            </ControlGroup.Description>
        </ControlGroup>
    );
}
