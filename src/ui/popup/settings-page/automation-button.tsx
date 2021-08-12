import {m} from 'malevic';
import {NavButton} from '../../controls';
import ControlGroup from '../control-group';
import WatchIcon from '../main-page/watch-icon';

export default function AutomationButton(props: {onClick: () => void}) {
    const now = new Date();
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <NavButton onClick={props.onClick}>
                    <span class="automation-button-icon">
                        <WatchIcon hours={now.getHours()} minutes={now.getMinutes()} />
                    </span>
                    Automation
                </NavButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Configure when app is enabled
            </ControlGroup.Description>
        </ControlGroup>
    );
}
