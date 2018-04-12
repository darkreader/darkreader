interface FetchParameters {
    url: string;
    responseType: 'blob' | 'text';
}

export function bgFetch(params: FetchParameters & {responseType: 'blob'}): Promise<Blob>;
export function bgFetch(params: FetchParameters & {responseType: 'text'}): Promise<string>;
export function bgFetch(params: FetchParameters) {
    return new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({type: 'fetch', data: params}, ({data, error}) => {
            if (error) {
                reject(error);
            } else {
                resolve(data);
            }
        });
    });
}
