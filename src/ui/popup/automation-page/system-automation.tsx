import {m} from 'malevic';
import type {UserSettings} from '../../../definitions';
import {getLocalMessage} from '../../../utils/locales';
import {Button, CheckBox} from '../../controls';
import type {ViewProps} from '../types';

export default function SystemAutomation(props: ViewProps) {
    const isSystemAutomation = props.data.settings.automation === 'system';
    function onEnablingSystemAutomation(value: UserSettings['automation']) {
        props.actions.changeSettings({automation: value});
    }
    return (
        <Array>
            <div class={[
                'automation-page__line',
                'automation-page__system-dark-mode',
            ]}
            >
                <CheckBox
                    class="automation-page__system-dark-mode__checkbox"
                    checked={isSystemAutomation}
                    onchange={(e: any) => onEnablingSystemAutomation(e.target.checked ? 'system' : '')}
                />
                <Button
                    class={{
                        'automation-page__system-dark-mode__button': true,
                        'automation-page__system-dark-mode__button--active': isSystemAutomation,
                    }}
                    onclick={() => onEnablingSystemAutomation(isSystemAutomation ? '' : 'system')}
                >
                    {getLocalMessage('system_dark_mode')}
                </Button>
            </div>
            <p class="automation-page__description">
                {getLocalMessage('system_dark_mode_description')}
            </p>
        </Array>
    );
}
