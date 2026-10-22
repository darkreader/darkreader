import {PromiseBarrier} from './promise-barrier';

/*
 * This class synchronizes some JS object's attributes and data stored in
 * chrome.storage.local, with minimal delay. It follows these principles:
 *  - no debouncing, data is saved as soon as saveState() is called
 *  - no concurrent writes (calls to s.c.l.set()): if saveState() is called
 *    repeatedly before previous call is complete, this class will wait for
 *    active write to complete and will save new data.
 *  - no concurrent reads (calls to s.c.l.get()): if loadState() is called
 *    repeatedly before previous call is complete, this class will wait for
 *    active read to complete and will resolve all loadState() calls at once.
 *  - all simultaneously active calls to saveState() and loadState() wait for
 *    data to settle and resolve only after data is guaranteed to be coherent.
 *  - data saved with the browser always wins (because JS typically has only
 *    default values)
 * In practice, these principles imply that at any given moment there is either
 * no active read and write operations or this class is performing exactly one
 * read or exactly one write operation.
 *
 * State manager is a state machine which works as follows:
 *       +-----------+
 *       |  Initial  |
 *       +-----------+
 *              |
 *              | StateManagerImpl.loadState() is called,
 *              | StateManagerImpl will call chrome.storage.local.get()
 *              |
 *              v
 *       +------------+
 *       |  Loading R |
 *       +------------+
 *              |
 *              | chrome.storage.local.get() callback is called,
 *              | StateManagerImpl has loaded the data.
 *              |
 *              v
 *        +----------+
 *        |  Ready   |
 *        +----------+<-------------------------------------+
 *              |                                           |
 *              | StateManagerImpl.saveState() is called,   |
 *              | StateManagerImpl will collect data and    |
 *              | call chrome.storage.local.set()           |
 *              v                                           |
 *       +-----------+--------------------------------------+
 *       |  Saving W |
 *       +-----------+<-------------------------------------+
 *              |                                           |
 *              | StateManagerImpl.saveState() is called    |
 *              | before ongoing write operation ends.      |
 *              |                                           |
 *              v                                           |
 *       +-------------------+                              |
 *       | Saving Override W |------------------------------+
 *       +-------------------+
 *
 * R and W indicate active read (get) and write (set) operations.
 *
 * Initial - Only constructor was called.
 * Loading - loadState() is called
 * Ready - data was retreived from storage.
 * Saving - saveState() is called and there is no chrome.storage.local.set()
 *   operation in progress. We just need to collect and save the data.
 * Saving Override - saveState() is called before the last write operation
 *   was complete (data became obsolete even before it was written to storage).
 *   We wait for ongoing write operation to end and only then start a new one.
 */

enum StateManagerImplState {
    INITIAL = 0,
    LOADING = 1,
    READY = 2,
    SAVING = 3,
    SAVING_OVERRIDE = 4
}

export class StateManagerImpl<T extends Record<string, unknown>> {
    private localStorageKey: string;
    private parent;
    private defaults: T;
    private logWarn: (log: string) => void;

    private meta: StateManagerImplState;
    private barrier: PromiseBarrier<void, void> | null = null;

    private storage: {
        get: (storageKey: string, callback: (items: { [key: string]: any }) => void) => void;
        set: (items: { [key: string]: any }, callback: () => void) => void;
    };

    constructor(localStorageKey: string, parent: any, defaults: T, storage: {get: (storageKey: string, callback: (items: { [key: string]: any }) => void) => void; set: (items: { [key: string]: any }, callback: () => void) => void}, logWarn: (log: string) => void){
        this.localStorageKey = localStorageKey;
        this.parent = parent;
        this.defaults = defaults;
        this.storage = storage;
        this.logWarn = logWarn;

        this.meta = StateManagerImplState.INITIAL;
        this.barrier = new PromiseBarrier();

        // TODO(Anton): consider calling this.loadState() to preload data,
        // and remove StateManagerImplState.INITIAL.
    }

    private collectState() {
        const state = {} as T;
        for (const key of Object.keys(this.defaults) as Array<keyof T>) {
            state[key] = this.parent[key] ?? this.defaults[key];
        }
        return state;
    }

    private applyState(storage: T) {
        Object.assign(this.parent, this.defaults, storage);
    }

    private releaseBarrier() {
        const barrier = this.barrier;
        this.barrier = new PromiseBarrier();
        barrier!.resolve();
    }

    private saveStateInternal() {
        this.storage.set({[this.localStorageKey]: this.collectState()}, () => {
            switch (this.meta) {
                case StateManagerImplState.INITIAL:
                    // fallthrough
                case StateManagerImplState.LOADING:
                    // fallthrough
                case StateManagerImplState.READY:
                    this.logWarn('Unexpected state. Possible data race!');
                    return;
                case StateManagerImplState.SAVING:
                    this.meta = StateManagerImplState.READY;
                    this.releaseBarrier();
                    return;
                case StateManagerImplState.SAVING_OVERRIDE:
                    this.meta = StateManagerImplState.SAVING;
                    this.saveStateInternal();
            }
        });
    }

    // This function is not guaranteed to save state before returning
    async saveState(): Promise<void> {
        switch (this.meta) {
            case StateManagerImplState.INITIAL:
                // Make sure not to overwrite data before it is loaded
                this.logWarn('StateManager.saveState was called before StateManager.loadState(). Possible data race! Loading data instead.');
                return this.loadState();
            case StateManagerImplState.LOADING:
                // Need to wait for active read operation to end
                this.logWarn('StateManager.saveState was called before StateManager.loadState() resolved. Possible data race! Loading data instead.');
                return this.barrier!.entry();
            case StateManagerImplState.READY: {
                this.meta = StateManagerImplState.SAVING;
                const entry = this.barrier!.entry();
                this.saveStateInternal();
                return entry;
            }
            case StateManagerImplState.SAVING:
                // Another save is in progress
                this.meta = StateManagerImplState.SAVING_OVERRIDE;
                return this.barrier!.entry();
            case StateManagerImplState.SAVING_OVERRIDE:
                return this.barrier!.entry();
        }
    }

    private loadStateInternal() {
        this.storage.get(this.localStorageKey, (data: any) => {
            switch (this.meta) {
                case StateManagerImplState.INITIAL:
                case StateManagerImplState.READY:
                case StateManagerImplState.SAVING:
                case StateManagerImplState.SAVING_OVERRIDE:
                    this.logWarn('Unexpected state. Possible data race!');
                    return;
                case StateManagerImplState.LOADING:
                    this.meta = StateManagerImplState.READY;
                    this.applyState(data[this.localStorageKey]);
                    this.releaseBarrier();
            }
        });
    }

    async loadState(): Promise<void> {
        switch (this.meta) {
            case StateManagerImplState.INITIAL: {
                this.meta = StateManagerImplState.LOADING;
                const entry = this.barrier!.entry();
                this.loadStateInternal();
                return entry;
            }
            case StateManagerImplState.READY:
                return;
            case StateManagerImplState.SAVING:
                return this.barrier!.entry();
            case StateManagerImplState.SAVING_OVERRIDE:
                return this.barrier!.entry();
            case StateManagerImplState.LOADING:
                return this.barrier!.entry();
        }
    }
}
