if (!window.hasOwnProperty('chrome')) {
    window.chrome = {} as any;
}
if (!chrome.hasOwnProperty('runtime')) {
    chrome.runtime = {} as any;
}
if (!chrome.runtime.hasOwnProperty('onMessage')) {
    const listeners = new Set();
    chrome.runtime.onMessage = {
        addListener: (listener) => {
            listeners.add(listener);
        },
        removeListener: (listener) => {
            listeners.delete(listener);
        },
    } as any;
}
