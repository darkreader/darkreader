import {generateUID} from '../../utils/uid';
import type {MessageBGtoCS, MessageCStoBG} from '../../definitions';
import {MessageTypeBGtoCS, MessageTypeCStoBG} from '../../utils/message';

interface FetchRequest {
    url: string;
    responseType: 'data-url' | 'text';
    mimeType?: string;
    origin?: string;
}

const resolvers = new Map<string, (data: string) => void>();
const rejectors = new Map<string, (reason?: any) => void>();

export async function bgFetch(request: FetchRequest): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const id = generateUID();
        resolvers.set(id, resolve);
        rejectors.set(id, reject);
        chrome.runtime.sendMessage<MessageCStoBG>({type: MessageTypeCStoBG.FETCH, data: request, id});
    });
}

chrome.runtime.onMessage.addListener(({type, data, error, id}: MessageBGtoCS) => {
    if (type === MessageTypeBGtoCS.FETCH_RESPONSE) {
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
