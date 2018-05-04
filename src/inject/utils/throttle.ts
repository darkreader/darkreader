export function throttle<T extends Function>(callback: T) {
    let pending = false;
    let frameId: number = null;
    let lastArgs: any[];

    const throttled: T = ((...args) => {
        lastArgs = args;
        if (frameId) {
            pending = true;
        } else {
            callback(...lastArgs);
            frameId = requestAnimationFrame(() => {
                frameId = null;
                if (pending) {
                    callback(...lastArgs);
                    pending = false;
                }
            });
        }
    }) as any;

    const cancel = () => {
        cancelAnimationFrame(frameId);
        pending = false;
        frameId = null;
    };

    return Object.assign(throttled, {cancel});
}
