import {logWarn} from '../../utils/log';
import {PromiseBarrier} from '../../utils/promise-barrier';
import {isNonPersistent} from './migration';

/*
 * State manager is a state machine which works as follows:
 *    +-----------+       +------------+
 *    |  Initial  |------>|  Disabled  |
 *    +-----------+       +------------+
 *           |
 *           | StateManager.loadState() is called,
 *           | StateManager will call chrome.storage.local.get()
 *           |
 *           v
 *    +-----------+
 *    |  Loading  |
 *    +-----------+
 *           |
 *           | chrome.storage.local.get() callback is called,
 *           | StateManager has loaded the data.
 *           |
 *           v
 *     +----------+
 *     |  Ready   |<---------------------------------+
 *     +----------+                                  |
 *           |                                       |
 *           | StateManager.saveState() is called,   |
 *           | StateManager will callect data and    |
 *           | call chrome.storage.local.set()       |
 *           v                                       |
 *    +-----------+----------------------------------+
 *    |  Saving   |
 *    +-----------+<---------------------------------+
 *           |                                       |
 *           | StateManager.saveState() is called    |
 *           | before ongoing write operation ends.  |
 *           |                                       |
 *           v                                       |
 *    +-----------------+                            |
 *    | Saving Override |----------------------------+
 *    +-----------------+
 *
 * Initial - Only constructor was called.
 * Disabled - current build and/or platform uses persistent background.
 *   Storage anager is disabled (is a NOOP).
 * Loading - loadState() is called
 * Ready - data was retreived from storage.
 * Saving - saveState() is called and there is no chrome.storage.local.set()
 *   operation in progress. We just need to collect and save the data.
 * Saving Override - saveState() is called before the last write operation
 *   was complete (data became obsolete even before it was written to storage).
 *   We wait for ongoing write operation to end and only then start a new one.
 */
export enum StateManagerState {
    INITIAL = 0,
    DISABLED = 1,
    LOADING = 2,
    READY = 3,
    SAVING = 4,
    SAVING_OVERRIDE = 5,
}

export class StateManager<T> {
    private localStorageKey: string;
    private parent;
    private defaults: T;

    private meta: StateManagerState = StateManagerState.INITIAL;
    // loadStateBarrier is guaranteed to exists only when meta is LOADING.
    private loadStateBarrier: PromiseBarrier<void, void> = null;

    constructor(localStorageKey: string, parent: any, defaults: T){
        if (!isNonPersistent()) {
            // Do nothing if the current build uses persistent background
            this.meta = StateManagerState.DISABLED;
            return;
        }
        this.localStorageKey = localStorageKey;
        this.parent = parent;
        this.defaults = defaults;

        // TODO(Anton): consider calling this.loadState() to preload data
    }

    private collectState() {
        const state = {} as T;
        for (const key of Object.keys(this.defaults) as Array<keyof T>) {
            state[key] = this.parent[key] || this.defaults[key];
        }
        return state;
    }

    // This function is not guaranteed to save state before returning
    async saveState(): Promise<void> {
        switch (this.meta) {
            case StateManagerState.DISABLED:
                return;
            case StateManagerState.LOADING:
                // fallthrough
            case StateManagerState.INITIAL:
                // Make sure not to overwrite data before it is loaded
                logWarn('StateManager.saveState is called while loading data. Possible data race!');
                if (this.loadStateBarrier) {
                    await this.loadStateBarrier.entry();
                }
                this.meta = StateManagerState.SAVING;
                break;
            case StateManagerState.READY:
                this.meta = StateManagerState.SAVING;
                break;
            case StateManagerState.SAVING:
                // Another save is in progress
                this.meta = StateManagerState.SAVING_OVERRIDE;
                return;
            case StateManagerState.SAVING_OVERRIDE:
                // Do nothing
                return;
        }

        chrome.storage.local.set({[this.localStorageKey]: this.collectState()}, () => {
            switch (this.meta) {
                case StateManagerState.INITIAL:
                case StateManagerState.DISABLED:
                case StateManagerState.LOADING:
                case StateManagerState.READY:
                    logWarn('Unexpected state. Possible data race!');
                    // fallthrough
                case StateManagerState.SAVING:
                    this.meta = StateManagerState.READY;
                    break;
                case StateManagerState.SAVING_OVERRIDE:
                    this.meta = StateManagerState.READY;
                    this.saveState();
            }
        });
    }

    async loadState(): Promise<void> {
        switch (this.meta) {
            case StateManagerState.INITIAL:
                // Need to load
                this.meta = StateManagerState.LOADING;
                this.loadStateBarrier = new PromiseBarrier();
                return new Promise<void>((resolve) => {
                    chrome.storage.local.get(this.localStorageKey, (data) => {
                        this.meta = StateManagerState.READY;
                        if (data[this.localStorageKey]) {
                            Object.assign(this.parent, data[this.localStorageKey]);
                        } else {
                            Object.assign(this.parent, this.defaults);
                        }
                        this.loadStateBarrier.resolve();
                        this.loadStateBarrier = null;
                        resolve();
                    });
                });
            case StateManagerState.DISABLED:
                // fallthrough
            case StateManagerState.READY:
                // fallthrough
            case StateManagerState.SAVING:
                // fallthrough
            case StateManagerState.SAVING_OVERRIDE:
                return;
            case StateManagerState.LOADING:
                // Background state is being loaded, just need to wait
                return this.loadStateBarrier.entry();
        }
    }
}
