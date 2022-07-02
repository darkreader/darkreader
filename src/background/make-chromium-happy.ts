import {MessageType} from '../utils/message';
import type {Message} from '../definitions';
import {isChromium, isMV3} from '../utils/platform';

// This function exists to prevent Chrome from logging an error about
// closed conduit. It just sends a dummy message in response to incomming message
// to utilise open conduit. This response message is not even used on the other side.
export function makeChromiumHappy() {
    if (isMV3 || !isChromium) {
        return;
    }
    chrome.runtime.onMessage.addListener((message: Message, _, sendResponse) => {
        if (![
            // Messenger
            MessageType.UI_GET_DATA,
            MessageType.UI_APPLY_DEV_DYNAMIC_THEME_FIXES,
            MessageType.UI_APPLY_DEV_INVERSION_FIXES,
            MessageType.UI_APPLY_DEV_STATIC_THEMES,
        ].includes(message.type)) {
            sendResponse({type: '¯\\_(ツ)_/¯'});
        }
    });
}
