import {logWarn} from './log';

/**
  * This is the Mutex(Not to confuse with RW-Mutex).
  * This is to ensure that certain access are only done by 1 callback(a current fallpit of PromiseBarrier).
  * This ensures that their is a global mutex which can be called by a finite amount of callbacks.
  * We should ensure that the mutex can only be locked by the first callback which has requrested it
  * and only give the next callback the mutex lock once it's been released.
 */
export class Mutex {
    private awaitingResolves = [] as Array<() => void>;
    private locked = false;

    public isLocked() {
        return this.locked;
    }

    // Request a lock from the mutex.
    // It should only return/resolve once the lock is granted.
    public async lock() {
        // Easiest path, the mutex is not locked.
        // We lock the mutex and check if the mutex is locked.
        // If it is locked, we wait for the mutex to be unlocked.
        if (!this.locked) {
            this.locked = true;
            return;
        }
        return new Promise<void>((resolve) => {
            // Harder path, we will push the resolve
            // into the array and let it be for now.
            this.awaitingResolves.push(resolve);
        });
    }

    // Unlock the mutex.
    public unlock() {
        if (!this.locked) {
            logWarn('An unlocked mutex was tried to be unlocked.');
            return;
        }
        this.locked = false;
        setTimeout(() => this.executeNextOperation());
    }

    // Execute the next lock actions.
    private executeNextOperation() {
        if (this.awaitingResolves.length > 0) {
            // Get the first entry.
            const resolve = this.awaitingResolves.shift();
            // Simply execute the resolve.
            resolve();
        }
    }
}
