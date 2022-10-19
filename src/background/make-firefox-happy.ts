import {MessageType} from '../utils/message';
import type {Message} from '../definitions';
import {isFirefox} from '../utils/platform';

// This function exists to prevent Firefox Sidebars from appearing broken
// If the message does not have a proper sender, it aborts Dark Reader instance in that context
export function makeFirefoxHappy(message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response: 'unsupportedSender') => void) {
    if (isFirefox && (sender as any).envType === 'content_child' && sender.tab === undefined && message.type === MessageType.CS_FRAME_CONNECT) {
        sendResponse('unsupportedSender');
        return true;
    }
}
