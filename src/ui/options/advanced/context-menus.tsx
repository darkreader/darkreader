import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {isFirefox, isMobile} from '../../../utils/platform';
import {CheckButton} from '../../controls';

export function ContextMenus(props: ViewProps): Malevic.Child {
    function onContextMenusChange(checked: boolean) {
        if (checked) {
            if (isFirefox) {
                props.actions.changeSettings({enableContextMenus: true});
                return;
            }
            // We have to request permissions in foreground context in response to user action.
            // 'contextMenus' permission is granted automatically without any permission prompts.
            chrome.permissions.request({permissions: ['contextMenus']}, (hasPermission: boolean) => {
                if (hasPermission) {
                    props.actions.changeSettings({enableContextMenus: true});
                } else {
                    // This branch is never actually taken.
                    // Permission request was declined, we can not use context menus
                    // TODO: toggle back off
                    console.warn('User declined contextMenus permission prompt.');
                }
            });
        } else {
            props.actions.changeSettings({enableContextMenus: false});
        }
    }

    return isMobile ? null : (
        <CheckButton
            checked={props.data.settings.enableContextMenus}
            label="Use context menus"
            description={props.data.settings.enableContextMenus ?
                'Context menu integration is enabled' :
                'Context menu integration is disabled'}
            onChange={onContextMenusChange}
        />
    );
}
