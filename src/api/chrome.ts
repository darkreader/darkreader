if (!window.chrome) {
    window.chrome = {} as any;
}
if (!window.chrome.runtime) {
    window.chrome.runtime = {} as any;
}
const throwCORSError = () => {
    throw new Error('Access to some of your resources was blocked by cross-origin policy');
};
if (window.chrome.runtime.sendMessage) {
    const nativeSendMessage = window.chrome.runtime.sendMessage;
    window.chrome.runtime.sendMessage = (...args) => {
        if (args[0] && args[0].type === 'fetch') {
            throwCORSError();
        }
        nativeSendMessage.apply(window.chrome.runtime, args);
    };
} else {
    window.chrome.runtime.sendMessage = throwCORSError;
}
if (!window.chrome.runtime.onMessage) {
    window.chrome.runtime.onMessage = {
        addListener: Function.prototype,
    } as any;
}
