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

export function createThrottledTasksQueue(tasks: (() => void)[], callback?: () => void) {
    const FRAME_DURATION = 1000 / 60;
    let isRunning = false;
    tasks = tasks.slice();

    function runSyncChunk() {
        let syncDuration = 0;
        while (tasks.length && isRunning) {
            const task = tasks.shift();
            const startTime = performance.now();
            task();
            const endTime = performance.now();
            syncDuration += (endTime - startTime);
            if (syncDuration >= FRAME_DURATION) {
                requestAnimationFrame(() => runSyncChunk());
                break;
            }
        }
        if (tasks.length === 0) {
            callback && callback();
        }
    }

    return {
        run() {
            isRunning = true;
            runSyncChunk();
        },
        stop() {
            isRunning = false;
            tasks.splice(0);
        },
    };
}
