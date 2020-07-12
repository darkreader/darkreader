import {m} from 'malevic';
import {NavButton} from '../../controls';
import ControlGroup from '../control-group';
import {getLocalMessage} from '../../../utils/locales';

export default function ManageSettingsButton(props: {onClick: () => void}) {
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <NavButton onClick={props.onClick}>
                    {getLocalMessage('manage_settings')}
                </NavButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                {getLocalMessage('manage_settings_description')}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
