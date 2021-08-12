let nativeSendMessage: typeof chrome.runtime.sendMessage;
const bgResponses = new Map<string, string>();

export function stubChromeRuntimeMessage() {
    nativeSendMessage = chrome.runtime.sendMessage;
    const listeners = chrome.runtime.onMessage['__listeners__'];

    chrome.runtime.sendMessage = (message: any) => {
        if (message.type === 'fetch') {
            const {id, data: {url}} = message;
            setTimeout(() => {
                listeners.forEach((listener) => {
                    if (!bgResponses.has(url)) {
                        throw new Error('Response is missing, use `stubBackgroundFetchResponse()`');
                    }
                    const data = bgResponses.get(url);
                    listener({type: 'fetch-response', data, error: null, id});
                });
            });
        }
    };
}

export function resetChromeRuntimeMessageStub() {
    chrome.runtime.sendMessage = nativeSendMessage;
    bgResponses.clear();
}

export function stubBackgroundFetchResponse(url: string, content: string) {
    bgResponses.set(url, content);
}
