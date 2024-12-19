import {m} from 'malevic';

import type {Automation, MessageUItoBG, ViewProps} from '../../../definitions';
import {AutomationMode} from '../../../utils/automation';
import {getLocalMessage} from '../../../utils/locales';
import {MessageTypeUItoBG} from '../../../utils/message';
import {isMatchMediaChangeEventListenerBuggy} from '../../../utils/platform';
import {Button, CheckBox, ControlGroup, DropDown, TextBox, TimeRangePicker} from '../../controls';

declare const __CHROMIUM_MV3__: boolean;

export function AutomationTab(props: ViewProps): Malevic.Child {
    const isSystemAutomation = props.data.settings.automation.mode === AutomationMode.SYSTEM && props.data.settings.automation.enabled;
    const locationSettings = props.data.settings.location;
    const values = {
        'latitude': {
            min: -90,
            max: 90,
        },
        'longitude': {
            min: -180,
            max: 180,
        },
    };

    function getLocationString(location: number) {
        if (location == null) {
            return '';
        }

        return `${location}°`;
    }

    function locationChanged(inputElement: HTMLInputElement, newValue: string, type: 'latitude' | 'longitude') {
        if (newValue.trim() === '') {
            inputElement.value = '';

            props.actions.changeSettings({
                location: {
                    ...locationSettings,
                    [type]: null,
                },
            });

            return;
        }

        const min: number = values[type].min;
        const max: number = values[type].max;

        newValue = newValue.replace(',', '.').replace('°', '');

        let num = Number(newValue);
        if (isNaN(num)) {
            num = 0;
        } else if (num > max) {
            num = max;
        } else if (num < min) {
            num = min;
        }

        inputElement.value = getLocationString(num);

        props.actions.changeSettings({
            location: {
                ...locationSettings,
                [type]: num,
            },
        });
    }

    function changeAutomationMode(mode: Automation['mode']) {
        props.actions.changeSettings({automation: {...props.data.settings.automation, ...{mode, enabled: Boolean(mode)}}});
    }

    function changeAutomationBehavior(behavior: Automation['behavior']) {
        props.actions.changeSettings({automation: {...props.data.settings.automation, ...{behavior}}});
    }

    return <div class="settings-tab">
        <ControlGroup>
            <ControlGroup.Control class="automation__time-picker-control">
                <CheckBox
                    checked={props.data.settings.automation.mode === AutomationMode.TIME}
                    onchange={(e: {target: {checked: boolean}}) => changeAutomationMode(e.target.checked ? AutomationMode.TIME : AutomationMode.NONE)}
                />
                <TimeRangePicker
                    startTime={props.data.settings.time.activation}
                    endTime={props.data.settings.time.deactivation}
                    onChange={([start, end]) => props.actions.changeSettings({time: {activation: start, deactivation: end}})}
                />
            </ControlGroup.Control>
            <ControlGroup.Description>
                {getLocalMessage('set_active_hours')}
            </ControlGroup.Description>
        </ControlGroup>
        <ControlGroup>
            <ControlGroup.Control class="automation__location-control">
                <CheckBox
                    checked={props.data.settings.automation.mode === AutomationMode.LOCATION}
                    onchange={(e: {target: {checked: boolean}}) => changeAutomationMode(e.target.checked ? AutomationMode.LOCATION : AutomationMode.NONE)}
                />
                <TextBox
                    class="automation__location-control__latitude"
                    placeholder={getLocalMessage('latitude')}
                    onchange={(e: {target: HTMLInputElement}) => locationChanged(e.target, e.target.value, 'latitude')}
                    oncreate={(node: HTMLInputElement) => node.value = getLocationString(locationSettings.latitude!)}
                    onkeypress={(e) => {
                        if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                />
                <TextBox
                    class="automation__location-control__longitude"
                    placeholder={getLocalMessage('longitude')}
                    onchange={(e: {target: HTMLInputElement}) => locationChanged(e.target, e.target.value, 'longitude')}
                    oncreate={(node: HTMLInputElement) => node.value = getLocationString(locationSettings.longitude!)}
                    onkeypress={(e) => {
                        if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                />
            </ControlGroup.Control>
            <ControlGroup.Description>
                {getLocalMessage('set_location')}
            </ControlGroup.Description>
        </ControlGroup>
        <ControlGroup>
            <ControlGroup.Control class="automation__system-control">
                <CheckBox
                    class="automation__system-control__checkbox"
                    checked={isSystemAutomation}
                    onchange={(e: {target: {checked: boolean}}) => changeAutomationMode(e.target.checked ? AutomationMode.SYSTEM : AutomationMode.NONE)} />
                <Button
                    class={{
                        'automation__system-control__button': true,
                        'automation__system-control__button--active': isSystemAutomation,
                    }}
                    onclick={() => {
                        if (__CHROMIUM_MV3__) {
                            chrome.runtime.sendMessage<MessageUItoBG>({
                                type: MessageTypeUItoBG.COLOR_SCHEME_CHANGE,
                                data: {isDark: matchMedia('(prefers-color-scheme: dark)').matches},
                            });
                        }
                        changeAutomationMode(isSystemAutomation ? AutomationMode.NONE : AutomationMode.SYSTEM);
                    }}
                >{getLocalMessage('system_dark_mode')}</Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                {getLocalMessage('system_dark_mode_description')}
                {!isMatchMediaChangeEventListenerBuggy ? null :
                    [<br />, getLocalMessage('system_dark_mode_chromium_warning')]
                }
            </ControlGroup.Description>
        </ControlGroup>
        <ControlGroup>
            <ControlGroup.Control class="automation__behavior">
                <DropDown
                    onChange={(selected: any) => changeAutomationBehavior(selected)}
                    selected={props.data.settings.automation.behavior}
                    options={[
                        {id: 'OnOff', content: 'Toggle on/off'},
                        {id: 'Scheme', content: 'Toggle dark/light'},
                    ]}
                />
            </ControlGroup.Control>
            <ControlGroup.Description>
                Automation behavior
            </ControlGroup.Description>
        </ControlGroup>
    </div>;
}
