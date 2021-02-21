import {isIFrame} from './iframes';

const throwCORSError = async (url: string) => {
    return Promise.reject(new Error(
        [
            'Embedded Dark Reader cannot access a cross-origin resource',
            url,
            'Overview your URLs and CORS policies or use',
            '`DarkReader.setFetchMethod(fetch: (url) => Promise<Response>))`.',
            'See if using `DarkReader.setFetchMethod(window.fetch)`',
            'before `DarkReader.enable()` works.'
        ].join(' '),
    ));
};

type Fetcher = (url: string) => Promise<Response>;

let fetcher: Fetcher = throwCORSError;

export function setFetchMethod(fetch: Fetcher) {
    if (fetch) {
        fetcher = fetch;
    } else {
        fetcher = throwCORSError;
    }
}

export async function callFetchMethod(url: string, responseType: string) {
    if (isIFrame) {
        return await apiFetch(url, responseType);
    } else {
        return await fetcher(url);
    }
}

let counter = 0;
const resolvers = new Map<string, (data: any) => void>();

export async function apiFetch(url: string, responseType: string) {
    return new Promise<Response>((resolve) => {
        const id = `${++counter}-${window.location.href}`;
        resolvers.set(id, resolve);
        (window.top.postMessage as any)({type: 'fetch-api', url, id, responseType});
    });
}

if (isIFrame) {
    window.addEventListener('message', async (event: MessageEvent) => {
        // Do we trust the sender of this message?
        const {type, data, id} = event.data;
        if (type !== 'fetch-api-response' || event.origin !== window.location.origin) {
            return;
        } else {
            const resolve = resolvers.get(id);
            resolvers.delete(id);
            resolve && resolve(data);
        }
    });
}

async function readResponseAsDataURL(response: Response) {
    const blob = await response.blob();
    const dataURL = await (new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    }));
    return dataURL;
}

if (!isIFrame) {

    window.addEventListener('message', async (event: MessageEvent) => {
        // Do we trust the sender of this message?
        const {type, url, id, responseType} = event.data;
        if (type !== 'fetch-api' || event.origin !== window.location.origin) {
            return;
        } else {
            const response = await fetcher(url);
            let data: string;
            if (responseType === 'data-url') {
                data = await readResponseAsDataURL(response);
            } else {
                data = await response.text();
            }
            (event.source as any).postMessage({type: 'fetch-api-response', data, id}, event.origin);
        }
    });
}
