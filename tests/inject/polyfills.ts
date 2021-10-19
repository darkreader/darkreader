if (!window.hasOwnProperty('chrome')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.chrome = {} as any;
}
if (!chrome.hasOwnProperty('runtime')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    chrome.runtime.onMessage['__listeners__'] = listeners;
}
