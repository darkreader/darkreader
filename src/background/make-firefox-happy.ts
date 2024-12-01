import type {MessageCStoBG, MessageUItoBG} from '../definitions';
import {MessageTypeCStoBG} from '../utils/message';
import {isFirefox} from '../utils/platform';

// This function exists to prevent Firefox Sidebars from appearing broken
// If the message does not have a proper sender, it aborts Dark Reader instance in that context
export function makeFirefoxHappy(message: MessageUItoBG | MessageCStoBG, sender: chrome.runtime.MessageSender, sendResponse: (response: 'unsupportedSender') => void): boolean {
    if (isFirefox && (sender as any).envType === 'content_child' && sender.tab === undefined && message.type === MessageTypeCStoBG.DOCUMENT_CONNECT) {
        sendResponse('unsupportedSender');
        return true;
    }
    return false;
}
