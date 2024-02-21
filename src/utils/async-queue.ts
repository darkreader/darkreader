export type Task = () => void;

const MAX_FRAME_DURATION = 1000 / 60;

export default class AsyncQueue {
    private queue: Task[] = [];
    private timerId: number | null = null;

    addTask(task: Task): void {
        this.queue.push(task);
        this.scheduleFrame();
    }

    stop(): void {
        if (this.timerId !== null) {
            cancelAnimationFrame(this.timerId);
            this.timerId = null;
        }
        this.queue = [];
    }

    private scheduleFrame(): void {
        if (this.timerId) {
            return;
        }
        this.timerId = requestAnimationFrame(() => {
            this.timerId = null;
            const start = Date.now();
            let cb: Task | undefined;
            while ((cb = this.queue.shift())) {
                cb();
                if (Date.now() - start >= MAX_FRAME_DURATION) {
                    this.scheduleFrame();
                    break;
                }
            }
        });
    }
}
