import {m} from 'malevic';
import {getLocalMessage} from '../../../utils/locales';
import {MultiSwitch} from '../../controls';
import ControlGroup from '../control-group';
import type {ViewProps} from '../types';
import WatchIcon from './watch-icon';
import SunMoonIcon from './sun-moon-icon';
import SystemIcon from './system-icon';

export default function AppSwitch(props: ViewProps) {
    const isOn = props.data.settings.enabled === true && !props.data.settings.automation;
    const isOff = props.data.settings.enabled === false && !props.data.settings.automation;
    const isAutomation = Boolean(props.data.settings.automation);
    const isTimeAutomation = props.data.settings.automation === 'time';
    const isLocationAutomation = props.data.settings.automation === 'location';
    const now = new Date();

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

    const descriptionText = isOn ?
        'Extension is enabled' :
        isOff ?
            'Extension is disabled' :
            isTimeAutomation ?
                'Switches according to specified time' :
                isLocationAutomation ?
                    'Switched according to location' :
                    'Switches according to system dark mode';
    const description = (
        <span
            class={{
                'app-switch__description': true,
                'app-switch__description--on': props.data.isEnabled,
                'app-switch__description--off': !props.data.isEnabled,
            }}
        >
            {descriptionText}
        </span>
    );

    return (
        <ControlGroup class="app-switch">
            <ControlGroup.Control>
                <MultiSwitch
                    class="app-switch__control"
                    options={values}
                    value={value}
                    onChange={onSwitchChange}
                >
                    <span
                        class={{
                            'app-switch__time': true,
                            'app-switch__time--active': isAutomation,
                        }}
                    >
                        {(isTimeAutomation
                            ? <WatchIcon hours={now.getHours()} minutes={now.getMinutes()} />
                            : (isLocationAutomation
                                ? (<SunMoonIcon date={now} latitude={props.data.settings.location.latitude} longitude={props.data.settings.location.longitude} />)
                                : <SystemIcon />))}
                    </span>
                </MultiSwitch>
            </ControlGroup.Control>
            <ControlGroup.Description>
                {description}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
