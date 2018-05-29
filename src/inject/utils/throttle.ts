const FPS_60 = 1000 / 60;

export function throttle<T extends Function>(callback: T, timeout?: number) {
    const requestFrame = timeout == null || timeout <= FPS_60 ? requestAnimationFrame : (fn) => setTimeout(fn, timeout);
    const cancelFrame = timeout == null || timeout <= FPS_60 ? cancelAnimationFrame : clearTimeout;

    let pending = false;
    let frameId: number = null;
    let lastArgs: any[];

    const throttled: T = ((...args) => {
        lastArgs = args;
        if (frameId) {
            pending = true;
        } else {
            callback(...lastArgs);
            frameId = requestFrame(() => {
                frameId = null;
                if (pending) {
                    callback(...lastArgs);
                    pending = false;
                }
            });
        }
    }) as any;

    const cancel = () => {
        cancelFrame(frameId);
        pending = false;
        frameId = null;
    };

    return Object.assign(throttled, {cancel});
}
