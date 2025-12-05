import type {MessageBGtoCS, MessageCStoBG} from '../../definitions';
import {MessageTypeBGtoCS, MessageTypeCStoBG} from '../../utils/message';
import {generateUID} from '../../utils/uid';

interface FetchRequest {
    url: string;
    responseType: 'data-url' | 'text';
    mimeType?: string;
    origin: string;
}

const resolvers = new Map<string, (data: string) => void>();
const rejectors = new Map<string, (reason?: any) => void>();

export async function bgFetch(request: FetchRequest): Promise<string> {
    if ((window as any).DarkReader?.Plugins?.fetch) {
        return (window as any).DarkReader.Plugins.fetch(request);
    }
    const parsedURL = new URL(request.url);
    if (parsedURL.origin !== request.origin && shouldIgnoreCors(parsedURL)) {
        throw new Error('Cross-origin limit reached');
    }
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
            reject && reject(typeof error === 'string' ? new Error(error) : error);
        } else {
            resolve && resolve(data);
        }
    }
});

const ipV4RegExp = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
const MAX_CORS_DOMAINS = 16;
const corsDomains = new Set<string>();

function shouldIgnoreCors(url: URL) {
    const host = url.hostname;
    if (!corsDomains.has(host)) {
        corsDomains.add(host);
    }
    if (
        corsDomains.size >= MAX_CORS_DOMAINS ||
        host === 'localhost' ||
        host.startsWith('[') ||
        host.endsWith('.local') ||
        host.match(ipV4RegExp)
    ) {
        return true;
    }
    return false;
}
