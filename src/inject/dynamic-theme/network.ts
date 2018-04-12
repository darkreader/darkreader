interface FetchResponse {
    dataURL: string;
    text: string;
    type: string;
}

let counter = 0;
const resolvers = new Map<number, (data) => void>();
const rejectors = new Map<number, (error) => void>();

export function bgFetch(url: string) {
    return new Promise<FetchResponse>((resolve, reject) => {
        const id = ++counter;
        resolvers.set(id, resolve);
        rejectors.set(id, reject);
        chrome.runtime.sendMessage({type: 'fetch', data: url, id});
    });
}

chrome.runtime.onMessage.addListener(({type, data, error, id}) => {
    if (type === 'fetch-response') {
        const resolve = resolvers.get(id);
        const reject = rejectors.get(id);
        resolvers.delete(id);
        rejectors.delete(id);
        if (error) {
            reject(error);
        } else {
            resolve(data);
        }
    }
});
