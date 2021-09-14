import {m} from 'malevic';
import {isMobile} from '../../../utils/platform';
import CheckButton from '../check-button';
import type {ViewProps} from '../types';

export default function ContextMenusGroup(props: ViewProps) {
    function onContextMenusChange(checked: boolean) {
        if (checked) {
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

    return !isMobile && (
        <CheckButton
            checked={props.data.settings.enableContextMenus}
            label="Use context menus"
            description={props.data.settings.enableContextMenus ?
                'Make use of context menus when appropriate' :
                'Do not use context menus'}
            onChange={onContextMenusChange}
        />
    );
}
