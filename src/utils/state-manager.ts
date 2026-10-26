import {isNonPersistent} from './platform';

type Storage = {
    get: (storageKey: string, callback: (items: {[key: string]: any}) => void) => void;
    set: (items: {[key: string]: any}, callback: () => void) => void;
};

export class StateManager<T extends Record<string, unknown>> {
    private localStorageKey: string;
    private parent: any;
    private defaults: T;
    private logWarn: (...args: any[]) => void;
    private storage: Storage | null;

    private loaded = false;
    private loading: Promise<void> | null = null;
    private saving: Promise<void> | null = null;
    private saveRequested = false;

    constructor(localStorageKey: string, parent: any, defaults: T, logWarn: (...args: any[]) => void, storage: Storage | null = isNonPersistent ? chrome.storage.session : null){
        this.localStorageKey = localStorageKey;
        this.parent = parent;
        this.defaults = defaults;
        this.logWarn = logWarn;
        this.storage = storage;
    }

    private collectState(): T {
        const state = {} as T;
        for (const key of Object.keys(this.defaults) as Array<keyof T>) {
            state[key] = this.parent[key] ?? this.defaults[key];
        }
        return state;
    }

    async loadState(): Promise<void> {
        if (!this.storage || this.loaded) {
            return;
        }
        if (!this.loading) {
            const storage = this.storage;
            this.loading = new Promise<void>((resolve) => {
                storage.get(this.localStorageKey, (data) => {
                    Object.assign(this.parent, this.defaults, data[this.localStorageKey]);
                    this.loaded = true;
                    resolve();
                });
            });
        }
        await this.loading;
    }

    async saveState(): Promise<void> {
        if (!this.storage) {
            return;
        }
        if (!this.loaded) {
            this.logWarn('StateManager.saveState was called before StateManager.loadState(). Possible data race! Loading data instead.');
            return this.loadState();
        }
        this.saveRequested = true;
        if (!this.saving) {
            try {
                this.saving = this.runSaves();
                await this.saving;
            } catch (err) {
                this.logWarn('StateManager.saveState error', err);
            }
            this.saving = null;
        }
        await this.saving;
    }

    private async runSaves(): Promise<void> {
        const storage = this.storage!;
        while (this.saveRequested) {
            this.saveRequested = false;
            await new Promise<void>((resolve) => {
                storage.set({
                    [this.localStorageKey]: this.collectState(),
                }, () => resolve());
            });
        }
    }
}
