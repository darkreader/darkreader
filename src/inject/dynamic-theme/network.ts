interface FetchRequest {
    url: string;
    responseType: 'data-url' | 'text';
    mimeType?: string;
    origin?: string;
}

let counter = 0;
const resolvers = new Map<number, (data) => void>();
const rejectors = new Map<number, (error) => void>();

export async function bgFetch(request: FetchRequest) {
    return new Promise<string>((resolve, reject) => {
        const id = ++counter;
        resolvers.set(id, resolve);
        rejectors.set(id, reject);
        chrome.runtime.sendMessage({type: 'fetch', data: request, id});
    });
}

chrome.runtime.onMessage.addListener(({type, data, error, id}) => {
    if (type === 'fetch-response') {
        const resolve = resolvers.get(id);
        const reject = rejectors.get(id);
        resolvers.delete(id);
        rejectors.delete(id);
        if (error) {
            reject && reject(error);
        } else {
            resolve && resolve(data);
        }
    }
});
