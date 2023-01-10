import {MessageType} from '../utils/message';
import type {Message} from '../definitions';
import {isPanel} from './utils/tab';

declare const __CHROMIUM_MV2__: boolean;

// This function exists to prevent Chrome from logging an error about
// closed conduit. It just sends a dummy message in response to incomming message
// to utilise open conduit. This response message is not even used on the other side.
export function makeChromiumHappy() {
    if (!__CHROMIUM_MV2__) {
        return;
    }
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
        if (![
            // Messenger
            MessageType.UI_GET_DATA,
            MessageType.UI_GET_DEVTOOLS_DATA,
            MessageType.UI_APPLY_DEV_DYNAMIC_THEME_FIXES,
            MessageType.UI_APPLY_DEV_INVERSION_FIXES,
            MessageType.UI_APPLY_DEV_STATIC_THEMES,
        ].includes(message.type) &&
            (message.type !== MessageType.CS_FRAME_CONNECT || !isPanel(sender))) {
            sendResponse({type: '¯\\_(ツ)_/¯'});
        }
    });
}
