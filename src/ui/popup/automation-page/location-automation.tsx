import {m} from 'malevic';
import type {UserSettings} from '../../../definitions';
import {getLocalMessage} from '../../../utils/locales';
import {CheckBox, TextBox} from '../../controls';
import type {ViewProps} from '../types';

export default function LocationAutomation(props: ViewProps) {
    const getLocationString = (location: number) => location ? `${location}°` : '';
    const locationSettings = props.data.settings.location;
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

    function onEnablingLocationAutomation(value: UserSettings['automation']) {
        props.actions.changeSettings({automation: value});
    }
    function onChangingLocationAutomation(inputElement: HTMLInputElement, newValue: string, type: string) {
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
    return (
        <Array>
            <div class="automation-page__line automation-page__location">
                <CheckBox
                    checked={props.data.settings.automation === 'location'}
                    onchange={(e: any) => onEnablingLocationAutomation(e.target.checked ? 'location' : '')}
                />
                <TextBox
                    class="automation-page__location__latitude"
                    placeholder={getLocalMessage('latitude')}
                    onchange={(e: { target: HTMLInputElement }) => onChangingLocationAutomation(e.target, e.target.value, 'latitude')}
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
                    onchange={(e: { target: HTMLInputElement }) => onChangingLocationAutomation(e.target, e.target.value, 'longitude')}
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
        </Array>
    );
}
