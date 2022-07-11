import {logWarn} from './log';
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
 *  - all simultaniously active calls to saveState() and loadState() wait for
 *    data to settle and resolve only after data is guaranteed to be coherent.
 *  - data saved with the browser always wins (because JS typically has only
 *    default values and to ensure that if the same class exists in multiple
 *    contexts every instance of this class has the same values)
 *
 * State manager is a state machine which works as follows:
 *    +-----------+
 *    |  Initial  |
 *    +-----------+
 *           |
 *           | StateManagerImpl.loadState() is called,
 *           | StateManagerImpl will call chrome.storage.local.get()
 *           |
 *           v
 *    +-----------+
 *    |  Loading  |
 *    +-----------+
 *           |
 *           | chrome.storage.local.get() callback is called,
 *           | StateManagerImpl has loaded the data.
 *           |
 *           v
 *     +----------+
 *     |  Ready   |<-------------------------------------+
 *     +----------+                                      |
 *           |                                           |
 *           | StateManagerImpl.saveState() is called,   |
 *           | StateManagerImpl will callect data and    |
 *           | call chrome.storage.local.set()           |
 *           v                                           |
 *    +-----------+--------------------------------------+
 *    |  Saving   |
 *    +-----------+<-------------------------------------+
 *           |                                           |
 *           | StateManagerImpl.saveState() is called    |
 *           | before ongoing write operation ends.      |
 *           |                                           |
 *           v                                           |
 *    +-----------------+                                |
 *    | Saving Override |--------------------------------+
 *    +-----------------+
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
    SAVING_OVERRIDE = 4,
}

export class StateManagerImpl<T> {
    private localStorageKey: string;
    private parent;
    private defaults: T;

    private meta: StateManagerImplState = StateManagerImplState.INITIAL;
    private barrier: PromiseBarrier<void, void> = null;

    private get: (storageKey: string, callback: (items: { [key: string]: any }) => void) => void;
    private set: (items: { [key: string]: any }, callback: () => void) => void;

    constructor(localStorageKey: string, parent: any, defaults: T, get: (storageKey: string, callback: (items: { [key: string]: any }) => void) => void, set: (items: { [key: string]: any }, callback: () => void) => void){
        this.localStorageKey = localStorageKey;
        this.parent = parent;
        this.defaults = defaults;
        this.barrier = new PromiseBarrier();
        this.get = get;
        this.set = set;

        // TODO(Anton): consider calling this.loadState() to preload data
    }

    private collectState() {
        const state = {} as T;
        for (const key of Object.keys(this.defaults) as Array<keyof T>) {
            state[key] = this.parent[key] || this.defaults[key];
        }
        return state;
    }

    private applyState(storage: T) {
        Object.assign(this.parent, this.defaults, storage);
    }

    private releaseBarrier() {
        const barrier = this.barrier;
        this.barrier = new PromiseBarrier();
        barrier.resolve();
    }

    saveStateInternal() {
        this.set({[this.localStorageKey]: this.collectState()}, () => {
            switch (this.meta) {
                case StateManagerImplState.INITIAL:
                case StateManagerImplState.LOADING:
                case StateManagerImplState.READY:
                    logWarn('Unexpected state. Possible data race!');
                    // fallthrough
                case StateManagerImplState.SAVING:
                    this.meta = StateManagerImplState.READY;
                    this.releaseBarrier();
                    break;
                case StateManagerImplState.SAVING_OVERRIDE:
                    this.meta = StateManagerImplState.SAVING;
                    this.saveStateInternal();
                    break;
            }
        });
    }

    // This function is not guaranteed to save state before returning
    async saveState(): Promise<void> {
        switch (this.meta) {
            case StateManagerImplState.INITIAL:
                // Make sure not to overwrite data before it is loaded
                logWarn('StateManager.saveState was called before StateManager.loadState(). Possible data race! Loading data instead.');
                return this.loadState();
            case StateManagerImplState.LOADING:
                logWarn('StateManager.saveState was called before StateManager.loadState() resolved. Possible data race! Loading data instead.');
                return this.loadState();
            case StateManagerImplState.READY:
                this.meta = StateManagerImplState.SAVING;
                const entry = this.barrier.entry();
                this.saveStateInternal();
                return entry;
            case StateManagerImplState.SAVING:
                // Another save is in progress
                this.meta = StateManagerImplState.SAVING_OVERRIDE;
                return this.barrier.entry();
            case StateManagerImplState.SAVING_OVERRIDE:
                return this.barrier.entry();
        }
    }

    loadStateInternal() {
        this.get(this.localStorageKey, (data: any) => {
            switch (this.meta) {
                case StateManagerImplState.INITIAL:
                case StateManagerImplState.READY:
                case StateManagerImplState.SAVING:
                case StateManagerImplState.SAVING_OVERRIDE:
                    logWarn('Unexpected state. Possible data race!');
                    // fallthrough
                case StateManagerImplState.LOADING:
                    this.meta = StateManagerImplState.READY;
                    this.applyState(data[this.localStorageKey]);
                    this.releaseBarrier();
            }
        });
    }

    async loadState(): Promise<void> {
        switch (this.meta) {
            case StateManagerImplState.INITIAL:
                // Need to load data
                this.meta = StateManagerImplState.LOADING;
                const entry = this.barrier.entry();
                this.loadStateInternal();
                return entry;
            case StateManagerImplState.READY:
                return;
            case StateManagerImplState.SAVING:
                // fallthrough
            case StateManagerImplState.SAVING_OVERRIDE:
                return this.barrier.entry();
            case StateManagerImplState.LOADING:
                return this.barrier.entry();
        }
    }
}
