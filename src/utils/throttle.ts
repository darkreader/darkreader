export function throttle<T extends(...args: any[]) => any>(callback: T) {
    let pending = false;
    let frameId: number = null;
    let lastArgs: any[];

    const throttled: T = ((...args: any[]) => {
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

type Task = () => void;

declare const __TEST__: boolean;

export function createAsyncTasksQueue() {
    const tasks: Task[] = [];
    let frameId: number = null;

    function runTasks() {
        let task: Task;
        while ((task = tasks.shift())) {
            task();
        }
        frameId = null;
        if (__TEST__) {
            document.dispatchEvent(new CustomEvent('__darkreader__test__asyncQueueComplete'));
        }
    }

    function add(task: Task) {
        tasks.push(task);
        if (!frameId) {
            frameId = requestAnimationFrame(runTasks);
        }
    }

    function cancel() {
        tasks.splice(0);
        cancelAnimationFrame(frameId);
        frameId = null;
    }

    return {add, cancel};
}
