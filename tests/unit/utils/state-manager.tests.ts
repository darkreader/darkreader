import {expect, jest, test} from '@jest/globals';

import {StateManagerImpl} from '../../../src/utils/state-manager-impl';

class PromiseWrapper {
    promises: Map<Promise<void>, 'pending' | 'resolved' | 'rejected'>;

    constructor() {
        this.promises = new Map();
    }

    add(promises: Promise<void> | Array<Promise<void>>) {
        if (!Array.isArray(promises)) {
            promises = [promises];
        }
        promises.forEach((promise) => {
            if (this.promises.has(promise)) {
                throw new Error('Already added');
            }
            this.promises.set(promise, 'pending');
            promise.then(() => this.promises.set(promise, 'resolved'))
                .catch(() => this.promises.set(promise, 'rejected'));
        });
    }

    clear() {
        this.promises.clear();
    }

    getState(promise: Promise<void>) {
        return this.promises.get(promise);
    }

    all(state: 'pending' | 'resolved' | 'rejected') {
        this.promises.forEach((s) => expect(s).toEqual(state));
    }
}

describe('State manager utility', () => {
    const nextTick = () => new Promise((r) => setTimeout(r));
    const noop = () => { /* noop */ };

    test('State manager basic functionality', async () => {
        const key = 'key';
        const storage: any = {
            fromStorage: 'fromStorage',
        };

        const getMock = jest.fn();
        const get = (storageKey: string, callback: any) => {
            expect(storageKey).toEqual(key);
            getMock();
            callback({});
        };

        const setMock = jest.fn();
        const set = (items: any, callback: () => void) => {
            Object.assign(storage, items);
            setMock();
            callback();
        };

        const parent: any = {
            noSync: true,
            fromParent: 'fromParent',
            fromStorage: undefined,
        };

        const stateManager = new StateManagerImpl(key, parent, {
            fromParent: 'fromDefault',
            fromStorage: 'fromDefault',
        }, {get, set}, noop, noop);

        expect(getMock).not.toHaveBeenCalled();
        expect(setMock).not.toHaveBeenCalled();
        expect(parent).toEqual({
            noSync: true,
            fromParent: 'fromParent',
            fromStorage: undefined,
        });

        await stateManager.loadState();
        expect(getMock).toHaveBeenCalled();
        expect(setMock).not.toHaveBeenCalled();
        expect(parent).toEqual({
            noSync: true,
            fromParent: 'fromDefault',
            fromStorage: 'fromDefault',
        });

        parent.other = 'another';
        await stateManager.saveState();
        expect(setMock).toHaveBeenCalled();
        expect(storage[key]).toEqual({
            fromParent: 'fromDefault',
            fromStorage: 'fromDefault',
        });
        expect(parent).toEqual({
            fromParent: 'fromDefault',
            fromStorage: 'fromDefault',
            noSync: true,
            other: 'another',
        });
    });

    test('State manager handles multiple concurrent loadState() calls', async () => {
        const key = 'key';

        let getCount = 0;
        let getCallback: (data: any) => void;
        const get = (storageKey: string, callback: (data: any) => void) => {
            getCount++;
            expect(storageKey).toEqual(key);
            getCallback = callback;
        };

        const setMock = jest.fn();

        const parent: any = {
            noSync: true,
            data: 'fromParent',
        };

        const stateManager = new StateManagerImpl(key, parent, {
            data: 'fromStorage',
        }, {get, set: setMock}, noop, noop);

        expect(setMock).not.toHaveBeenCalled();
        expect(parent).toEqual({
            noSync: true,
            data: 'fromParent',
        });

        // Multiple calls to loadState() should result in a single call to c.s.l.get()
        const promises = new PromiseWrapper();
        for (let i = 0; i < 5; i++) {
            promises.add(stateManager.loadState());
        }
        expect(getCount).toEqual(1);
        expect(parent).toEqual({
            noSync: true,
            data: 'fromParent',
        });
        promises.all('pending');

        expect(getCount).toEqual(1);

        getCallback!({});

        promises.all('pending');

        await nextTick();
        promises.all('resolved');
        expect(getCount).toEqual(1);
        expect(setMock).not.toHaveBeenCalled();
    });

    test('State manager handles multiple concurrent saveState() calls', async () => {
        const key = 'key';
        const storage: any = {};

        const get = (storageKey: string, callback: (data: any) => void) => {
            expect(storageKey).toEqual(key);
            callback({[storageKey]: storage[storageKey]});
        };

        const resolveSet = () => setCallback();
        let setCount = 0;
        let setCallback: () => void;
        const set = (items: any, callback: () => void) => {
            setCount++;
            setCallback = () => {
                Object.assign(storage, items);
                callback();
            };
        };

        const parent: any = {
            noSync: true,
            count: 100,
        };

        const stateManager = new StateManagerImpl(key, parent, {
            count: 0,
        }, {get, set}, noop, noop);

        expect(parent).toEqual({
            noSync: true,
            count: 100,
        });

        await stateManager.loadState();

        expect(parent).toEqual({
            noSync: true,
            count: 0,
        });

        // Multiple calls to loadState() should result in a single call to c.s.l.get()
        const promises = new PromiseWrapper();
        for (let i = 0; i < 5; i++) {
            parent.count++;
            promises.add(stateManager.saveState());
        }
        expect(setCount).toEqual(1);
        expect(parent).toEqual({
            noSync: true,
            count: 5,
        });
        promises.all('pending');


        // Resolve the first write
        expect(setCount).toEqual(1);
        resolveSet();
        expect(setCount).toEqual(2);

        promises.all('pending');

        await nextTick();
        promises.all('pending');

        expect(parent).toEqual({
            noSync: true,
            count: 5,
        });

        // Resolve the second write
        resolveSet();

        expect(setCount).toEqual(2);
        expect(storage).toEqual({
            key: {
                count: 5,
            },
        });

        await nextTick();
        promises.all('resolved');
    });

    test('State manager handles multiple concurrent saveState() calls', async () => {
        const key = 'key';
        const storage: any = {};

        const get = (storageKey: string, callback: (data: any) => void) => {
            expect(storageKey).toEqual(key);
            callback({[storageKey]: storage[storageKey]});
        };

        const resolveSet = () => setCallback();
        let setCount = 0;
        let setCallback: () => void;
        const set = (items: any, callback: () => void) => {
            setCount++;
            setCallback = () => {
                Object.assign(storage, items);
                callback();
            };
        };

        const parent: any = {
            noSync: true,
            count: 100,
        };

        const stateManager = new StateManagerImpl(key, parent, {
            count: 0,
        }, {get, set}, noop, noop);

        expect(parent).toEqual({
            noSync: true,
            count: 100,
        });

        await stateManager.loadState();

        expect(parent).toEqual({
            noSync: true,
            count: 0,
        });

        // Multiple calls to loadState() should result in a single call to c.s.l.get()
        const promises = new PromiseWrapper();
        for (let i = 0; i < 5; i++) {
            parent.count++;
            promises.add(stateManager.saveState());
        }
        expect(setCount).toEqual(1);
        expect(parent).toEqual({
            noSync: true,
            count: 5,
        });
        promises.all('pending');


        // Resolve the first write
        expect(setCount).toEqual(1);
        resolveSet();
        expect(setCount).toEqual(2);

        promises.all('pending');

        // Wait for the next tick when all loadState promises resolve
        await nextTick();
        promises.all('pending');

        expect(parent).toEqual({
            noSync: true,
            count: 5,
        });

        // Resolve the second write
        resolveSet();
        expect(setCount).toEqual(2);
        expect(storage).toEqual({
            key: {
                count: 5,
            },
        });

        await nextTick();
        promises.all('resolved');
    });

    test('State manager handles saveState() before loadState()', async () => {
        const key = 'key';
        const storage: any = {};

        let getCount = 0;
        let getCallback: () => void;
        const resolveGet = () => getCallback();
        const get = (storageKey: string, callback: (data: any) => void) => {
            expect(storageKey).toEqual(key);
            getCount++;
            getCallback = () => {
                callback({[storageKey]: storage[storageKey]});
            };
        };

        let setCount = 0;
        const set = () => setCount++;

        const parent: any = {
            data: 'fromParent',
        };

        const stateManager = new StateManagerImpl(key, parent, {
            data: 'fromDefault',
        }, {get, set}, noop, noop);

        expect(parent).toEqual({
            data: 'fromParent',
        });

        const promise = new PromiseWrapper();
        promise.add(stateManager.saveState());

        expect(parent).toEqual({
            data: 'fromParent',
        });
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(0);

        await nextTick();
        promise.promises.forEach((state) => expect(state).toBe('pending'));

        resolveGet();

        await nextTick();
        promise.promises.forEach((state) => expect(state).toBe('resolved'));

        expect(parent).toEqual({
            data: 'fromDefault',
        });

        await stateManager.loadState();

        expect(parent).toEqual({
            data: 'fromDefault',
        });

        expect(setCount).toEqual(0);
    });

    test('State manager handles interleaved saveState() and loadState()', async () => {
        const key = 'key';
        const storage: any = {};

        let getCount = 0;
        let getCallback: () => void;
        const resolveGet = () => getCallback();
        const get = (storageKey: string, callback: (data: any) => void) => {
            expect(storageKey).toEqual(key);
            getCount++;
            getCallback = () => {
                callback({[storageKey]: storage[storageKey]});
            };
        };

        let setCount = 0;
        let setCallback: () => void;
        const resolveSet = () => setCallback();
        const set = (items: any, callback: () => void) => {
            setCount++;
            setCallback = () => {
                Object.assign(storage, items);
                callback();
            };
        };

        const parent: any = {
            data: 'fromParent',
        };

        const stateManager = new StateManagerImpl(key, parent, {
            data: 'fromDefault',
        }, {get, set}, noop, noop);

        expect(parent).toEqual({
            data: 'fromParent',
        });

        const promises = new PromiseWrapper();
        promises.add([
            stateManager.loadState(),
            stateManager.loadState(),
            stateManager.saveState(),
            stateManager.loadState(),
            stateManager.loadState(),
            stateManager.saveState(),
            stateManager.saveState(),
            stateManager.saveState(),
        ]);

        expect(parent).toEqual({
            data: 'fromParent',
        });
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(0);

        await nextTick();
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(0);
        promises.all('pending');

        resolveGet();

        await nextTick();
        expect(parent).toEqual({
            data: 'fromDefault',
        });
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(0);
        promises.all('resolved');

        parent.data = 'new';
        await stateManager.loadState();
        expect(parent).toEqual({
            data: 'new',
        });
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(0);

        const promises2 = new PromiseWrapper();
        promises2.add([
            stateManager.saveState(),
            stateManager.loadState(),
            stateManager.saveState(),
            stateManager.loadState(),
            stateManager.loadState(),
            stateManager.saveState(),
            stateManager.loadState(),
            stateManager.saveState(),
        ]);

        expect(getCount).toEqual(1);
        expect(setCount).toEqual(1);

        expect(parent).toEqual({
            data: 'new',
        });

        resolveSet();

        await nextTick();
        expect(parent).toEqual({
            data: 'new',
        });
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(2);

        resolveSet();

        await nextTick();
        promises2.all('resolved');
    });

    test('State manager handles onChanged during saveState() and loadState()', async () => {
        const key = 'key';
        const storage: any = {};

        let getCount = 0;
        let getCallback: (() => void) | undefined;
        const resolveGet = () => {
            getCallback!();
            getCallback = undefined;
        };

        const get = (storageKey: string, callback: (data: any) => void) => {
            expect(storageKey).toEqual(key);
            getCount++;
            getCallback = () => {
                callback({[storageKey]: storage[storageKey]});
            };
        };

        let setCount = 0;
        let setCallback: (() => void) | undefined;
        const resolveSet = () => {
            setCallback!();
            setCallback = undefined;
        };

        const set = (items: any, callback: () => void) => {
            setCount++;
            setCallback = () => {
                Object.assign(storage, items);
                callback();
            };
        };

        let onChangedListener: ((data: any) => void) | undefined;
        const modifyInternalState = (data: any) => {
            expect(onChangedListener).toBeTruthy();
            const oldValue = storage[key];
            storage[key] = data;
            onChangedListener!({
                [key]: {
                    oldValue,
                    newValue: data,
                },
            });
        };

        const parent: any = {
            data: 'fromParent',
        };

        const stateManager = new StateManagerImpl(key, parent, {
            data: 'fromDefault',
        }, {get, set}, (listener) => onChangedListener = listener, noop);

        const c1 = jest.fn();
        stateManager.addChangeListener(c1);

        expect(parent).toEqual({
            data: 'fromParent',
        });

        const promises = new PromiseWrapper();
        promises.add(stateManager.loadState());

        expect(parent).toEqual({
            data: 'fromParent',
        });
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(0);

        await nextTick();
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(0);
        promises.all('pending');

        expect(c1).not.toHaveBeenCalled();

        modifyInternalState({
            data: 'fromStorageChange',
        });

        resolveGet();

        await nextTick();
        expect(c1).toHaveBeenCalled();
        expect(parent).toEqual({
            data: 'fromStorageChange',
        });
        expect(getCount).toEqual(2);
        expect(setCount).toEqual(0);
        promises.all('resolved');

        expect(stateManager.getStateForTesting()).toEqual('Ready');

        const c2 = jest.fn();
        stateManager.addChangeListener(c2);

        parent.data = 'new';
        await stateManager.loadState();
        expect(parent).toEqual({
            data: 'new',
        });
        expect(getCount).toEqual(2);
        expect(setCount).toEqual(0);
        expect(stateManager.getStateForTesting()).toEqual('Ready');

        const promises2 = new PromiseWrapper;
        promises2.add(stateManager.saveState());

        modifyInternalState({
            data: 'fromStorageChange2',
        });
        expect(getCount).toEqual(2);
        expect(setCount).toEqual(1);
        promises2.all('pending');

        // During data race the JS-world data does not get overwriten
        expect(parent).toEqual({
            data: 'new',
        });

        resolveSet();

        await nextTick();
        expect(parent).toEqual({
            data: 'new',
        });
        expect(getCount).toEqual(3);
        expect(setCount).toEqual(1);
        promises2.all('pending');

        expect(c2).not.toHaveBeenCalled();

        resolveGet();

        await nextTick();
        expect(c2).toHaveBeenCalled();
        expect(parent).toEqual({
            data: 'new',
        });
        expect(getCount).toEqual(3);
        expect(setCount).toEqual(1);
        promises2.all('resolved');
    });
});
