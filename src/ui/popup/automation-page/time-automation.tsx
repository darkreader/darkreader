import {m} from 'malevic';
import type {UserSettings} from '../../../definitions';
import {getLocalMessage} from '../../../utils/locales';
import {CheckBox, TimeRangePicker} from '../../controls';
import type {ViewProps} from '../types';

export default function TimeAutomation(props: ViewProps) {
    function onEnablingTimeAutomation(value: UserSettings['automation']) {
        props.actions.changeSettings({automation: value});
    }
    function onChangingTimeAutomation(value: UserSettings['time']) {
        props.actions.changeSettings({time: value});
    }
    return (
        <Array>
            <div class="automation-page__line">
                <CheckBox
                    checked={props.data.settings.automation === 'time'}
                    onchange={(e: any) => onEnablingTimeAutomation(e.target.checked ? 'time' : '')}
                />
                <TimeRangePicker
                    startTime={props.data.settings.time.activation}
                    endTime={props.data.settings.time.deactivation}
                    onChange={([start, end]) => onChangingTimeAutomation({activation: start, deactivation: end})}
                />
            </div>
            <p class="automation-page__description">
                {getLocalMessage('set_active_hours')}
            </p>
        </Array>
    );
}
