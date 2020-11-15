export function throttle<T extends(...args: Array<any>) => any>(callback: T) {
    let pending = false;
    let frameId: number = null;
    let lastArgs: Array<any>;

    const throttled: T = ((...args: Array<any>) => {
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

export function createAsyncTasksQueue() {
    const tasks: Array<Task> = [];
    let frameId = null;

    function runTasks() {
        let task: Task;
        while ((task = tasks.shift())) {
            task();
        }
        frameId = null;
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
