import {ViewProps} from '../types';
import {m} from 'malevic';
import {getLocalMessage} from '../../../utils/locales';
import {CheckBox, TimeRangePicker, TextBox, Button, Toggle} from '../../controls';

export default function AutomationPage(props: ViewProps) {
    const isSystemAutomation = props.data.settings.automation === 'system';
    const locationSettings = props.data.settings.location;
    const shouldEnableDisable = props.data.settings.shouldEnableDisable
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

    function getLocationString(location: number) {
        if (location == null) {
            return '';
        }

        return `${location}°`;
    }

    function locationChanged(inputElement: HTMLInputElement, newValue: string, type: string) {
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

    function changeShouldEnableDisable(value: boolean) {
        props.actions.changeSettings({shouldEnableDisable: value});
    }

    return (
        <div
            class={'automation-page'}
        >
            <div class="automation-page__line">
                <CheckBox
                    checked={props.data.settings.automation === 'time'}
                    onchange={(e: { target: { checked: any } }) => props.actions.changeSettings({automation: e.target.checked ? 'time' : ''})}
                />
                <TimeRangePicker
                    startTime={props.data.settings.time.activation}
                    endTime={props.data.settings.time.deactivation}
                    onChange={([start, end]) => props.actions.changeSettings({time: {activation: start, deactivation: end}})}
                />
            </div>
            <p class="automation-page__description">
                {getLocalMessage('set_active_hours')}
            </p>
            <div class="automation-page__line automation-page__location">
                <CheckBox
                    checked={props.data.settings.automation === 'location'}
                    onchange={(e: { target: { checked: any } }) => props.actions.changeSettings({automation: e.target.checked ? 'location' : ''})}
                />
                <TextBox
                    class="automation-page__location__latitude"
                    placeholder={getLocalMessage('latitude')}
                    onchange={(e: { target: HTMLInputElement }) => locationChanged(e.target, e.target.value, 'latitude')}
                    oncreate={(node: HTMLInputElement) => node.value = getLocationString(locationSettings.latitude)}
                    onkeypress={(e) => {
                        if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                />
                <TextBox
                    class="automation-page__location__longitude"
                    placeholder={getLocalMessage('longitude')}
                    onchange={(e: { target: HTMLInputElement }) => locationChanged(e.target, e.target.value, 'longitude')}
                    oncreate={(node: HTMLInputElement) => node.value = getLocationString(locationSettings.longitude)}
                    onkeypress={(e) => {
                        if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                />
            </div>
            <p class="automation-page__location-description">
                {getLocalMessage('set_location')}
            </p>
            <div class={[
                'automation-page__line',
                'automation-page__system-dark-mode',
            ]}
            >
                <CheckBox
                    class="automation-page__system-dark-mode__checkbox"
                    checked={isSystemAutomation}
                    onchange={(e: { target: { checked: any } }) => props.actions.changeSettings({automation: e.target.checked ? 'system' : ''})}
                />
                <Button
                    class={{
                        'automation-page__system-dark-mode__button': true,
                        'automation-page__system-dark-mode__button--active': isSystemAutomation,
                    }}
                    onclick={() => props.actions.changeSettings({automation: isSystemAutomation ? '' : 'system'})}
                >{getLocalMessage('system_dark_mode')}
                </Button>
            </div>
            <p class="automation-page__description">
                {getLocalMessage('system_dark_mode_description')}
            </p>
            <div class='automation-page__line'>
                <Button
                    class={{'mode-toggle__button--active': shouldEnableDisable === true}}
                    onclick={() => changeShouldEnableDisable(false)}
                >
                </Button>
                <Toggle
                    checked={shouldEnableDisable === true}
                    labelOn={'Label On'}
                    labelOff={'Label Off'}
                    onChange={() => changeShouldEnableDisable(shouldEnableDisable ? false : true)}
                />
                <Button
                    class={{'automation-page__button--active': shouldEnableDisable === false}}
                    onclick={() => changeShouldEnableDisable(true)}
                >
                </Button>
            </div>
            <label class="automation-page__label">{getLocalMessage('mode')}</label>
        </div>
    );
}
