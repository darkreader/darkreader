import {m} from 'malevic';
import {NavButton} from '../../controls';
import ControlGroup from '../control-group';

export default function MiscellaneousButton(props: {onClick: () => void}) {
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <NavButton onClick={props.onClick}>
                    Miscellaneous settings
                </NavButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Miscellaneous settings for Dark Reader.
            </ControlGroup.Description>
        </ControlGroup>
    );
}
