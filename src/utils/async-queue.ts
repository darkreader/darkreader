export type QueueEntry = () => void;

// AsyncQueue is a class that helps with managing tasks.
// More specifically, it helps with tasks that are often used.
// It's fully asyncronous and uses promises and tries to get 60FPS.
export default class AsyncQueue {
    private queue: QueueEntry[] = [];
    private timerId: number = null;
    private frameDuration = 1000 / 60;

    addToQueue(entry: QueueEntry) {
        this.queue.push(entry);
        this.startQueue();
    }

    stopQueue() {
        if (this.timerId !== null) {
            cancelAnimationFrame(this.timerId);
            this.timerId = null;
        }
        this.queue = [];
    }

    // Ensures 60FPS.
    private startQueue() {
        if (this.timerId) {
            return;
        }
        this.timerId = requestAnimationFrame(() => {
            this.timerId = null;
            const start = Date.now();
            let cb: () => void;
            while ((cb = this.queue.shift())) {
                cb();
                if (Date.now() - start >= this.frameDuration) {
                    this.startQueue();
                    break;
                }
            }
        });
    }
}
