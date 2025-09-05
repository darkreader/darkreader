import {m} from 'malevic';

import type {Automation, MessageUItoBG, ViewProps} from '../../../definitions';
import {AutomationMode} from '../../../utils/automation';
import {getLocalMessage} from '../../../utils/locales';
import {MessageTypeUItoBG} from '../../../utils/message';
import {isMatchMediaChangeEventListenerBuggy} from '../../../utils/platform';
import {Button, CheckBox, ControlGroup} from '../../controls';

declare const __CHROMIUM_MV3__: boolean;

export function AutomationTab(props: ViewProps): Malevic.Child {
    const isSystemAutomation = props.data.settings.automation.mode === AutomationMode.SYSTEM && props.data.settings.automation.enabled;

    function changeAutomationMode(mode: Automation['mode']) {
        props.actions.changeSettings({automation: {...props.data.settings.automation, ...{mode, enabled: Boolean(mode)}}});
    }

    return <div class="settings-tab">
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

    </div>;
}
