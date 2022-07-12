import {StateManagerImpl} from '../../../src/utils/state-manager-impl';

describe('State manager utility', () => {
    const nextTick = () => new Promise((r) => setTimeout(r));

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
            fromStorage: 'fromDefault'
        }, get, set);

        expect(getMock).not.toBeCalled();
        expect(setMock).not.toBeCalled();
        expect(parent).toEqual({
            noSync: true,
            fromParent: 'fromParent',
            fromStorage: undefined,
        });

        await stateManager.loadState();
        expect(getMock).toBeCalled();
        expect(setMock).not.toBeCalled();
        expect(parent).toEqual({
            noSync: true,
            fromParent: 'fromDefault',
            fromStorage: 'fromDefault',
        });

        parent.other = 'another';
        await stateManager.saveState();
        expect(setMock).toBeCalled();
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
        }, get, setMock);

        expect(setMock).not.toBeCalled();
        expect(parent).toEqual({
            noSync: true,
            data: 'fromParent',
        });

        // Multiple calls to loadState() should result in a single call to c.s.l.get()
        const promises = new Map();
        for (let i = 0; i < 5; i++) {
            const promise = stateManager.loadState();
            promises.set(promise, 'pending');
            promise
                .then(() => promises.set(promise, 'resolved'))
                .catch(() => promises.set(promise, 'rejected'));
        }
        expect(getCount).toEqual(1);
        expect(parent).toEqual({
            noSync: true,
            data: 'fromParent',
        });
        promises.forEach((state) => expect(state).toEqual('pending'));

        expect(getCount).toEqual(1);

        getCallback({});

        promises.forEach((state) => expect(state).toBe('pending'));

        await nextTick();
        promises.forEach((state) => expect(state).toBe('resolved'));
        expect(getCount).toEqual(1);
        expect(setMock).not.toBeCalled();
    });

    test('State manager handles multiple concurrent saveState() calls', async () => {
        const key = 'key';
        const storage: any = {};

        const get = (storageKey: string, callback: (data: any) => void) => {
            expect(storageKey).toEqual(key);
            callback({[storageKey]: storage[storageKey]});
        };

        const resolveSet = () => setCallbacks.shift()();
        let setCount = 0;
        const setCallbacks: Array<() => void> = [];
        const set = (items: any, callback: () => void) => {
            setCount++;
            setCallbacks.push(() => {
                Object.assign(storage, items);
                callback();
            });
        };

        const parent: any = {
            noSync: true,
            count: 100,
        };

        const stateManager = new StateManagerImpl(key, parent, {
            count: 0,
        }, get, set);

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
        const promises = new Map();
        for (let i = 0; i < 5; i++) {
            parent.count++;
            const promise = stateManager.saveState();
            promises.set(promise, 'pending');
            promise
                .then(() => promises.set(promise, 'resolved'))
                .catch(() => promises.set(promise, 'rejected'));
        }
        expect(setCount).toEqual(1);
        expect(parent).toEqual({
            noSync: true,
            count: 5,
        });
        promises.forEach((state) => expect(state).toEqual('pending'));


        // Resolve the first write
        expect(setCount).toEqual(1);
        resolveSet();
        expect(setCount).toEqual(2);

        promises.forEach((state) => expect(state).toBe('pending'));

        await nextTick();
        promises.forEach((state) => expect(state).toBe('pending'));

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
            }
        });

        await nextTick();
        promises.forEach((state) => expect(state).toBe('resolved'));
    });

    test('State manager handles multiple concurrent saveState() calls', async () => {
        const key = 'key';
        const storage: any = {};

        const get = (storageKey: string, callback: (data: any) => void) => {
            expect(storageKey).toEqual(key);
            callback({[storageKey]: storage[storageKey]});
        };

        const resolveSet = () => setCallbacks.shift()();
        let setCount = 0;
        const setCallbacks: Array<() => void> = [];
        const set = (items: any, callback: () => void) => {
            setCount++;
            setCallbacks.push(() => {
                Object.assign(storage, items);
                callback();
            });
        };

        const parent: any = {
            noSync: true,
            count: 100,
        };

        const stateManager = new StateManagerImpl(key, parent, {
            count: 0,
        }, get, set);

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
        const promises = new Map();
        for (let i = 0; i < 5; i++) {
            parent.count++;
            const promise = stateManager.saveState();
            promises.set(promise, 'pending');
            promise
                .then(() => promises.set(promise, 'resolved'))
                .catch(() => promises.set(promise, 'rejected'));
        }
        expect(setCount).toEqual(1);
        expect(parent).toEqual({
            noSync: true,
            count: 5,
        });
        promises.forEach((state) => expect(state).toEqual('pending'));


        // Resolve the first write
        expect(setCount).toEqual(1);
        resolveSet();
        expect(setCount).toEqual(2);

        promises.forEach((state) => expect(state).toBe('pending'));

        // Wait for the next tick when all loadState promises resolve
        await nextTick();
        promises.forEach((state) => expect(state).toBe('pending'));

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
            }
        });

        await nextTick();
        promises.forEach((state) => expect(state).toBe('resolved'));
    });

    test('State manager handles saveState() before loadState()', async () => {
        const key = 'key';
        const storage: any = {};

        let getCount = 0;
        const getCallbacks: Array<() => void> = [];
        const resolveGet = () => getCallbacks.shift()();
        const get = (storageKey: string, callback: (data: any) => void) => {
            expect(storageKey).toEqual(key);
            getCount++;
            getCallbacks.push(() => {
                callback({[storageKey]: storage[storageKey]});
            });
        };

        let setCount = 0;
        const setCallbacks: Array<() => void> = [];
        const set = (items: any, callback: () => void) => {
            setCount++;
            setCallbacks.push(() => {
                Object.assign(storage, items);
                callback();
            });
        };

        const parent: any = {
            data: 'fromParent',
        };

        const stateManager = new StateManagerImpl(key, parent, {
            data: 'fromDefault',
        }, get, set);

        expect(parent).toEqual({
            data: 'fromParent',
        });

        let savePromiseState = 'pending';
        stateManager.saveState()
            .then(() => savePromiseState = 'resolved')
            .catch(() => savePromiseState = 'rejected');

        expect(parent).toEqual({
            data: 'fromParent',
        });
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(0);

        await nextTick();
        expect(savePromiseState).toEqual('pending');

        resolveGet();

        await nextTick();
        expect(savePromiseState).toEqual('resolved');

        expect(parent).toEqual({
            data: 'fromDefault',
        });

        await stateManager.loadState();

        expect(parent).toEqual({
            data: 'fromDefault'
        });

        expect(setCount).toEqual(0);
    });

    test('State manager handles interleaved saveState() and loadState()', async () => {
        const key = 'key';
        const storage: any = {};

        let getCount = 0;
        const getCallbacks: Array<() => void> = [];
        const resolveGet = () => getCallbacks.shift()();
        const get = (storageKey: string, callback: (data: any) => void) => {
            expect(storageKey).toEqual(key);
            getCount++;
            getCallbacks.push(() => {
                callback({[storageKey]: storage[storageKey]});
            });
        };

        let setCount = 0;
        const setCallbacks: Array<() => void> = [];
        const resolveSet = () => setCallbacks.shift()();
        const set = (items: any, callback: () => void) => {
            setCount++;
            setCallbacks.push(() => {
                Object.assign(storage, items);
                callback();
            });
        };

        const parent: any = {
            data: 'fromParent',
        };

        const stateManager = new StateManagerImpl(key, parent, {
            data: 'fromDefault',
        }, get, set);

        expect(parent).toEqual({
            data: 'fromParent',
        });

        const promises = new Map();
        [
            stateManager.loadState(),
            stateManager.loadState(),
            stateManager.saveState(),
            stateManager.loadState(),
            stateManager.loadState(),
            stateManager.saveState(),
            stateManager.saveState(),
            stateManager.saveState(),
        ].forEach((p) => {
            promises.set(p, 'pending');
            p.then(() => promises.set(p, 'resolved')).catch(() => promises.set(p, 'rejected'));
        });

        expect(parent).toEqual({
            data: 'fromParent',
        });
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(0);

        await nextTick();
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(0);
        promises.forEach((state) => expect(state).toBe('pending'));

        resolveGet();

        await nextTick();
        expect(parent).toEqual({
            data: 'fromDefault',
        });
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(0);
        promises.forEach((state) => expect(state).toBe('resolved'));

        parent.data = 'new';
        await stateManager.loadState();
        expect(parent).toEqual({
            data: 'new'
        });
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(0);

        const promises2 = new Map();
        [
            stateManager.saveState(),
            stateManager.loadState(),
            stateManager.saveState(),
            stateManager.loadState(),
            stateManager.loadState(),
            stateManager.saveState(),
            stateManager.loadState(),
            stateManager.saveState(),
        ].forEach((p) => {
            promises2.set(p, 'pending');
            p.then(() => promises.set(p, 'resolved')).catch(() => promises.set(p, 'rejected'));
        });

        expect(getCount).toEqual(1);
        expect(setCount).toEqual(1);

        expect(parent).toEqual({
            data: 'new'
        });

        resolveSet();

        await nextTick();
        expect(parent).toEqual({
            data: 'new',
        });
        expect(getCount).toEqual(1);
        expect(setCount).toEqual(2);
        promises.forEach((state) => expect(state).toBe('resolved'));
    });
});
