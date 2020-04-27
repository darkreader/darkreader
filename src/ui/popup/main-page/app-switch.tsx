import {m} from 'malevic';
import {getLocalMessage} from '../../../utils/locales';
import {MultiSwitch} from '../../controls';
import ControlGroup from '../control-group';
import {ViewProps} from '../types';

export default function AppSwitch(props: ViewProps) {
    const isOn = props.data.settings.enabled === true && !props.data.settings.automation;
    const isOff = props.data.settings.enabled === false && !props.data.settings.automation;

    // TODO: Replace messages with some IDs.
    const values = [
        getLocalMessage('on'),
        'Auto',
        getLocalMessage('off'),
    ];
    const value = isOn ? values[0] : isOff ? values[2] : values[1];

    function onSwitchChange(v: string) {
        const index = values.indexOf(v);
        if (index === 0) {
            props.actions.changeSettings({
                enabled: true,
                automation: '',
            });
        } else if (index === 2) {
            props.actions.changeSettings({
                enabled: false,
                automation: '',
            });
        } else if (index === 1) {
            props.actions.changeSettings({
                automation: 'system',
            });
        }
    }

    const description = isOn ?
        'Extension is enabled' :
        isOff ?
            'Extension is disabled' :
            // TODO: More messages (location, time etc).
            'Switches according to system dark mode';

    return (
        <ControlGroup class="app-switch">
            <ControlGroup.Control>
                <MultiSwitch
                    class="app-switch__control"
                    options={values}
                    value={value}
                    onChange={onSwitchChange}
                />
            </ControlGroup.Control>
            <ControlGroup.Description>
                {description}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
