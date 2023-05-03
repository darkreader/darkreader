import {generateRandomId} from '../../utils/uid';
import type {Message} from '../../definitions';
import {MessageType} from '../../utils/message';

interface FetchRequest {
    url: string;
    responseType: 'data-url' | 'text';
    mimeType?: string;
    origin?: string;
}

const resolvers = new Map<number, (data: string) => void>();
const rejectors = new Map<number, (reason?: any) => void>();

export async function bgFetch(request: FetchRequest): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const id = generateRandomId();
        resolvers.set(id, resolve);
        rejectors.set(id, reject);
        chrome.runtime.sendMessage<Message>({type: MessageType.CS_FETCH, data: request, id});
    });
}

chrome.runtime.onMessage.addListener(({type, data, error, id}: Message) => {
    if (type === MessageType.BG_FETCH_RESPONSE) {
        const resolve = resolvers.get(id!);
        const reject = rejectors.get(id!);
        resolvers.delete(id!);
        rejectors.delete(id!);
        if (error) {
            reject && reject(error);
        } else {
            resolve && resolve(data);
        }
    }
});
