if (!window.chrome) {
    window.chrome = {} as any;
}
if (!window.chrome.runtime) {
    window.chrome.runtime = {
        sendMessage() {
            throw new Error('Access to some of your resources was blocked by cross-origin policy');
        },
        onMessage: {
            addListener: Function.prototype,
        },
    } as any;
}