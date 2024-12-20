import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {getLocalMessage} from '../../../utils/locales';
import {ControlGroup, Shortcut} from '../../controls';

export function HotkeysTab(props: ViewProps): Malevic.Child {
    const {data, actions} = props;
    return <div class="settings-tab">
        <ControlGroup>
            <ControlGroup.Control>
                <Shortcut
                    class="hotkeys__control"
                    commandName="toggle"
                    shortcuts={data.shortcuts}
                    textTemplate={(hotkey) => (hotkey
                        ? hotkey
                        : getLocalMessage('click_to_set_shortcut')
                    )}
                    onSetShortcut={(shortcut) => actions.setShortcut('toggle', shortcut)}
                />
            </ControlGroup.Control>
            <ControlGroup.Description>
                Enable/disable the extension
            </ControlGroup.Description>
        </ControlGroup>
        <ControlGroup>
            <ControlGroup.Control>
                <Shortcut
                    class="hotkeys__control"
                    commandName="addSite"
                    shortcuts={data.shortcuts}
                    textTemplate={(hotkey) => (hotkey
                        ? hotkey
                        : getLocalMessage('click_to_set_shortcut')
                    )}
                    onSetShortcut={(shortcut) => actions.setShortcut('addSite', shortcut)}
                />
            </ControlGroup.Control>
            <ControlGroup.Description>
                Toggle the current website
            </ControlGroup.Description>
        </ControlGroup>
    </div>;
}
