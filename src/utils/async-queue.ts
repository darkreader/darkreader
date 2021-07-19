export type QueueEntry = () => void;

// queue manager is an class that helps with managing tasks.
// More specifically, it helps with tasks that are often used.
// It's fully asyncronous and uses promises and tries to get 60FPS.
export default class AsyncQueue {
    private queue: QueueEntry[] = [];
    private timerID: number = null;
    private frameDuration = 1000 / 60;

    addToQueue(entry: QueueEntry) {
        this.queue.push(entry);
        this.requestQueue();
    }

    stopQueue() {
        if (this.timerID !== null) {
            cancelAnimationFrame(this.timerID);
            this.timerID = null;
        }
        this.queue = [];
    }

    // Ensures 60FPS.
    private requestQueue() {
        if (this.timerID) {
            return;
        }
        this.timerID = requestAnimationFrame(() => {
            this.timerID = null;
            const start = Date.now();
            let cb: () => void;
            while ((cb = this.queue.shift())) {
                cb();
                if (Date.now() - start >= this.frameDuration) {
                    this.requestQueue();
                    break;
                }
            }
        });
    }
}
