if (!window.hasOwnProperty('chrome')) {
    window.chrome = {} as any;
}
if (!chrome.hasOwnProperty('runtime')) {
    chrome.runtime = {} as any;
}
if (!chrome.runtime.hasOwnProperty('onMessage')) {
    type AnyFunction = () => void;
    const listeners = new Set<AnyFunction>();
    chrome.runtime.onMessage = {
        addListener: (listener: AnyFunction) => {
            listeners.add(listener);
        },
        removeListener: (listener: AnyFunction) => {
            listeners.delete(listener);
        },
    } as any;
    chrome.runtime.onMessage['__listeners__'] = listeners;
}
