import {MessageType} from '../utils/message';
import type {Message} from '../definitions';

// This function exists to prevent Chrome from logging an error about
// closed conduit. It just sends a dummy message in response to incomming message
// to utilise open conduit. This response message is not even used on the other side.
export function makeChromiumHappy() {
    chrome.runtime.onMessage.addListener((message: Message, _, sendResponse) => {
        if (![
            // TabManager
            MessageType.CS_FRAME_CONNECT,

            // Messenger
            MessageType.UI_GET_DATA,
            MessageType.UI_GET_ACTIVE_TAB_INFO,
            MessageType.UI_APPLY_DEV_DYNAMIC_THEME_FIXES,
            MessageType.UI_APPLY_DEV_INVERSION_FIXES,
            MessageType.UI_APPLY_DEV_STATIC_THEMES,
        ].includes(message.type)) {
            sendResponse({type: '¯\\_(ツ)_/¯'});
        }
    });
}
