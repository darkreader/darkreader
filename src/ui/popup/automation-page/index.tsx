import { m } from 'malevic';
import { getLocalMessage } from '../../../utils/locales';
import { CheckBox, TimeRangePicker, TextBox, Button } from '../../controls';
import DropDown from '../../controls/dropdown/index';
import { MessageTypeUItoBG } from '../../../utils/message';
import type { MessageUItoBG } from '../../../definitions';
import type { ViewProps } from '../types';
import type { Automation } from 'definitions';
import { AutomationMode } from '../../../utils/automation';
import { isMatchMediaChangeEventListenerBuggy } from '../../../utils/platform';

declare const __CHROMIUM_MV3__: boolean;

export default function AutomationPage(props: ViewProps) {
    const isSystemAutomation =
        props.data.settings.automation.mode === AutomationMode.SYSTEM &&
        props.data.settings.automation.enabled;
    const locationSettings = props.data.settings.location;
    const values = {
        latitude: {
            min: -90,
            max: 90,
        },
        longitude: {
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

    function locationChanged(
        inputElement: HTMLInputElement,
        newValue: string,
        type: 'latitude' | 'longitude',
    ) {
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
        props.actions.changeSettings({
            automation: {
                ...props.data.settings.automation,
                ...{ mode, enabled: Boolean(mode) },
            },
        });
    }

    function changeAutomationBehavior(behavior: Automation['behavior']) {
        props.actions.changeSettings({
            automation: { ...props.data.settings.automation, ...{ behavior } },
        });
    }

    return (
        <div class={'automation-page'}>
            <div class='automation-page__line'>
                <CheckBox
                    checked={
                        props.data.settings.automation.mode ===
                        AutomationMode.TIME
                    }
                    onchange={(e: { target: { checked: boolean } }) =>
                        changeAutomationMode(
                            e.target.checked
                                ? AutomationMode.TIME
                                : AutomationMode.NONE,
                        )
                    }
                />
                <TimeRangePicker
                    startTime={props.data.settings.time.activation}
                    endTime={props.data.settings.time.deactivation}
                    onChange={([start, end]) =>
                        props.actions.changeSettings({
                            time: { activation: start, deactivation: end },
                        })
                    }
                />
            </div>
            <p class='automation-page__description'>
                {getLocalMessage('set_active_hours')}
            </p>
            <div class='automation-page__line automation-page__location'>
                <CheckBox
                    checked={
                        props.data.settings.automation.mode ===
                        AutomationMode.LOCATION
                    }
                    onchange={(e: { target: { checked: boolean } }) =>
                        changeAutomationMode(
                            e.target.checked
                                ? AutomationMode.LOCATION
                                : AutomationMode.NONE,
                        )
                    }
                />
                <TextBox
                    class='automation-page__location__latitude'
                    placeholder={getLocalMessage('latitude')}
                    onchange={(e: { target: HTMLInputElement }) =>
                        locationChanged(e.target, e.target.value, 'latitude')
                    }
                    oncreate={(node: HTMLInputElement) =>
                        (node.value = getLocationString(
                            locationSettings.latitude!,
                        ))
                    }
                    onkeypress={(e) => {
                        if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                />
                <TextBox
                    class='automation-page__location__longitude'
                    placeholder={getLocalMessage('longitude')}
                    onchange={(e: { target: HTMLInputElement }) =>
                        locationChanged(e.target, e.target.value, 'longitude')
                    }
                    oncreate={(node: HTMLInputElement) =>
                        (node.value = getLocationString(
                            locationSettings.longitude!,
                        ))
                    }
                    onkeypress={(e) => {
                        if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                />
            </div>
            <p class='automation-page__location-description'>
                {getLocalMessage('set_location')}
            </p>
            <div
                class={[
                    'automation-page__line',
                    'automation-page__system-dark-mode',
                ]}
            >
                <CheckBox
                    class='automation-page__system-dark-mode__checkbox'
                    checked={isSystemAutomation}
                    onchange={(e: { target: { checked: boolean } }) =>
                        changeAutomationMode(
                            e.target.checked
                                ? AutomationMode.SYSTEM
                                : AutomationMode.NONE,
                        )
                    }
                />
                <Button
                    class={{
                        'automation-page__system-dark-mode__button': true,
                        'automation-page__system-dark-mode__button--active':
                            isSystemAutomation,
                    }}
                    onclick={() => {
                        if (__CHROMIUM_MV3__) {
                            chrome.runtime.sendMessage<MessageUItoBG>({
                                type: MessageTypeUItoBG.COLOR_SCHEME_CHANGE,
                                data: {
                                    isDark: matchMedia(
                                        '(prefers-color-scheme: dark)',
                                    ).matches,
                                },
                            });
                        }
                        changeAutomationMode(
                            isSystemAutomation
                                ? AutomationMode.NONE
                                : AutomationMode.SYSTEM,
                        );
                    }}
                >
                    {getLocalMessage('system_dark_mode')}
                </Button>
            </div>
            <p class='automation-page__description'>
                {getLocalMessage('system_dark_mode_description')}
            </p>
            {!isMatchMediaChangeEventListenerBuggy ? null : (
                <p class='automation-page__warning'>
                    {getLocalMessage('system_dark_mode_chromium_warning')}
                </p>
            )}
            <DropDown
                onChange={(selected: any) => changeAutomationBehavior(selected)}
                selected={props.data.settings.automation.behavior}
                options={[
                    { id: 'OnOff', content: 'Toggle on/off' },
                    { id: 'Scheme', content: 'Toggle dark/light' },
                ]}
            />
            <p class='automation-page__description'>Automation behavior</p>
        </div>
    );
}
