import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';

export default function QuickToggle(props: ViewProps) {
    const isOn = props.data.isEnabled;

    function onToggle() {
        props.actions.changeSettings({
            enabled: !isOn,
            automation: {...props.data.settings.automation, enabled: false},
        });
    }

    return (
        <div class="quick-toggle">
            <button
                class={{
                    'quick-toggle__button': true,
                    'quick-toggle__button--on': isOn,
                    'quick-toggle__button--off': !isOn,
                }}
                onclick={onToggle}
            >
                <span class="quick-toggle__icon" />
                <span class="quick-toggle__label">
                    {isOn ? 'ON' : 'OFF'}
                </span>
            </button>
            <div class="quick-toggle__status">
                {isOn ? 'Dark Mode Enabled' : 'Dark Mode Disabled'}
            </div>
        </div>
    );
}
