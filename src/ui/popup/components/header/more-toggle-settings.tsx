import {html} from 'malevic';
import {CheckBox, TimeRangePicker} from '../../../controls';
import {getLocalMessage} from '../../../../utils/locales';
import {ExtWrapper} from '../../../../definitions';

type MoreToggleSettingsProps = ExtWrapper & {
    isExpanded: boolean;
    onClose: () => void;
};

export default function MoreToggleSettings({data, actions, isExpanded, onClose}: MoreToggleSettingsProps) {
    return (
        <div
            class={{
                'header__app-toggle__more-settings': true,
                'header__app-toggle__more-settings--expanded': isExpanded,
            }}
        >
            <div class="header__app-toggle__more-settings__top">
                <span class="header__app-toggle__more-settings__top__text">{getLocalMessage('time_settings')}</span>
                <span class="header__app-toggle__more-settings__top__close" role="button" onclick={onClose}>✕</span>
            </div>
            <div class="header__app-toggle__more-settings__content">
                <div class="header__app-toggle__more-settings__line">
                    <CheckBox
                        checked={data.settings.automation === 'time'}
                        onchange={(e) => actions.changeSettings({automation: e.target.checked ? 'time' : ''})}
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
            </div>
        </div>
    );
}
