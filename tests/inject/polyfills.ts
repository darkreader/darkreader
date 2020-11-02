if (!window.hasOwnProperty('chrome')) {
    window.chrome = {} as any;
}
if (!chrome.hasOwnProperty('runtime')) {
    chrome.runtime = {} as any;
}
if (!chrome.runtime.hasOwnProperty('onMessage')) {
    const listeners = new Set<Function>();
    chrome.runtime.onMessage = {
        addListener: (listener: Function) => {
            listeners.add(listener);
        },
        removeListener: (listener: Function) => {
            listeners.delete(listener);
        },
    } as any;
}
