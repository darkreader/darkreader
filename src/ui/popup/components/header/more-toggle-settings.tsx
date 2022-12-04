import {m} from 'malevic';
import {Button, CheckBox, TextBox, TimeRangePicker} from '../../../controls';
import {getLocalMessage} from '../../../../utils/locales';
import type {Automation, ExtWrapper} from '../../../../definitions';
import {AutomationMode} from '../../../../utils/automation';
import {isMatchMediaChangeEventListenerBuggy} from '../../../../utils/platform';

type MoreToggleSettingsProps = ExtWrapper & {
    isExpanded: boolean;
    onClose: () => void;
};

export default function MoreToggleSettings({data, actions, isExpanded, onClose}: MoreToggleSettingsProps) {
    const isSystemAutomation = data.settings.automation.mode === AutomationMode.SYSTEM;
    const locationSettings = data.settings.location;
    const values = {
        'latitude': {
            min: -90,
            max: 90
        },
        'longitude': {
            min: -180,
            max: 180,
        },
    };

    function getLocationString(location: number | null) {
        if (location == null) {
            return '';
        }

        return `${location}°`;
    }

    function locationChanged(inputElement: HTMLInputElement, newValue: string, type: 'latitude' | 'longitude') {
        if (newValue.trim() === '') {
            inputElement.value = '';

            actions.changeSettings({
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

        actions.changeSettings({
            location: {
                ...locationSettings,
                [type]: num,
            },
        });
    }

    function changeAutomationMode(mode: Automation['mode']) {
        actions.changeSettings({automation: {...data.settings.automation, ...{mode, enabled: Boolean(mode)}}});
    }

    return (
        <div
            class={{
                'header__app-toggle__more-settings': true,
                'header__app-toggle__more-settings--expanded': isExpanded,
            }}
        >
            <div class="header__app-toggle__more-settings__top">
                <span class="header__app-toggle__more-settings__top__text">{getLocalMessage('automation')}</span>
                <span class="header__app-toggle__more-settings__top__close" role="button" onclick={onClose}>✕</span>
            </div>
            <div class="header__app-toggle__more-settings__content">
                <div class="header__app-toggle__more-settings__line">
                    <CheckBox
                        checked={data.settings.automation.mode === AutomationMode.TIME}
                        onchange={(e: {target: HTMLInputElement}) => changeAutomationMode(e.target.checked ? AutomationMode.TIME : AutomationMode.NONE)}
                    />
                    <TimeRangePicker
                        startTime={data.settings.time.activation}
                        endTime={data.settings.time.deactivation}
                        onChange={([start, end]) => actions.changeSettings({time: {activation: start, deactivation: end}})}
                    />
                </div>
                <p class="header__app-toggle__more-settings__description">
                    {getLocalMessage('set_active_hours')}
                </p>
                <div class="header__app-toggle__more-settings__line header__app-toggle__more-settings__location">
                    <CheckBox
                        checked={data.settings.automation.mode === AutomationMode.LOCATION}
                        onchange={(e: {target: HTMLInputElement}) => changeAutomationMode(e.target.checked ? AutomationMode.LOCATION : AutomationMode.NONE)}
                    />
                    <TextBox
                        class="header__app-toggle__more-settings__location__latitude"
                        placeholder={getLocalMessage('latitude')}
                        onchange={(e: {target: HTMLInputElement}) => locationChanged(e.target, e.target.value, 'latitude')}
                        oncreate={(node: HTMLInputElement) => node.value = getLocationString(locationSettings.latitude)}
                        onkeypress={(e: KeyboardEvent) => {
                            if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                    />
                    <TextBox
                        class="header__app-toggle__more-settings__location__longitude"
                        placeholder={getLocalMessage('longitude')}
                        onchange={(e) => locationChanged(e.target, e.target.value, 'longitude')}
                        oncreate={(node: HTMLInputElement) => node.value = getLocationString(locationSettings.longitude)}
                        onkeypress={(e) => {
                            if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                    />
                </div>
                <p class="header__app-toggle__more-settings__location-description">
                    {getLocalMessage('set_location')}
                </p>
                <div class={[
                    'header__app-toggle__more-settings__line',
                    'header__app-toggle__more-settings__system-dark-mode',
                ]}
                >
                    <CheckBox
                        class="header__app-toggle__more-settings__system-dark-mode__checkbox"
                        checked={isSystemAutomation}
                        onchange={(e: {target: HTMLInputElement}) => changeAutomationMode(e.target.checked ? AutomationMode.SYSTEM : AutomationMode.NONE)}
                    />
                    <Button
                        class={{
                            'header__app-toggle__more-settings__system-dark-mode__button': true,
                            'header__app-toggle__more-settings__system-dark-mode__button--active': isSystemAutomation,
                        }}
                        onclick={() =>changeAutomationMode(isSystemAutomation ? AutomationMode.NONE : AutomationMode.SYSTEM)}
                    >{getLocalMessage('system_dark_mode')}</Button>
                </div>
                <p class="header__app-toggle__more-settings__description">
                    {getLocalMessage('system_dark_mode_description')}
                </p>
                {!isMatchMediaChangeEventListenerBuggy ? null :
                    <p class="header__app-toggle__more-settings__warning">
                        {getLocalMessage('system_dark_mode_chromium_warning')}
                    </p>
                }
            </div>
        </div>
    );
}
