import {DocumentInfo, ExtensionData, Message, TabInfo} from '../../definitions';

type messageListenerResponse = {data?: ExtensionData | TabInfo; error?: string} | {type: '¯\\_(ツ)_/¯'} | 'unsupportedSender';

// Note: return value true indicates that sendResponse() will be called asynchroneously
type messageListenerCallback = (message: Message, sender: DocumentInfo, sendResponse: (response: messageListenerResponse) => void) => true | void | Promise<void>;

export default class Tabs {
    private static listeners: messageListenerCallback[];

    static async sendMessage<R>(message: Message): Promise<R> {
        return chrome.runtime.sendMessage<Message, R>(message);
    }

    static async sendDocumentMessage<R>(documentId: string, message: Message): Promise<R> {
        return chrome.tabs.sendMessage<Message, R>(0, message, {documentId} as chrome.tabs.MessageSendOptions);
    }
}
