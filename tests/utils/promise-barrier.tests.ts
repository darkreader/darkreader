import {PromiseBarrier} from '../../src/utils/promise-barrier';

test('Promise barrier utility', async () => {
    const barrier = new PromiseBarrier();
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    (async () => {
        fn1();
        const result = await barrier.entry();
        fn2(result);
    })();
    expect(fn1).toBeCalled();
    expect(fn2).not.toBeCalled();

    expect(barrier.isPending()).toBe(true);
    expect(barrier.isFulfilled()).toBe(false);
    expect(barrier.isRejected()).toBe(false);
    await barrier.resolve(2);
    expect(barrier.isFulfilled()).toBe(true);
    expect(barrier.isPending()).toBe(false);
    expect(barrier.isRejected()).toBe(false);
    expect(fn1).toBeCalledTimes(1);
    expect(fn2).toBeCalledWith(2);
});

test('Promise barrier utility: awaiting for barrier after it was settled', async () => {
    const barrierFulfilled = new PromiseBarrier();
    expect(barrierFulfilled.isPending()).toBe(true);
    expect(barrierFulfilled.isFulfilled()).toBe(false);
    expect(barrierFulfilled.isRejected()).toBe(false);
    const promise1 = barrierFulfilled.resolve('Hello World!');
    expect(barrierFulfilled.isFulfilled()).toBe(true);
    expect(barrierFulfilled.isPending()).toBe(false);
    expect(barrierFulfilled.isRejected()).toBe(false);
    const fn1 = jest.fn();
    (async () => fn1(await barrierFulfilled.entry()))();
    await promise1;
    expect(fn1).toBeCalledWith('Hello World!');

    const barrierRejected = new PromiseBarrier();
    const promise2 = barrierRejected.reject('rejection reason');
    const fn2 = jest.fn();
    (async () => {
        try {
            await barrierRejected.entry();
        } catch (e) {
            fn2(e);
        }
    })();
    await promise2;
    expect(fn2).toBeCalledWith('rejection reason');
});

test('Promise barrier utility: resolving multiple times', async () => {
    const barrierFulfilled = new PromiseBarrier();
    expect(barrierFulfilled.isPending()).toBe(true);
    expect(barrierFulfilled.isFulfilled()).toBe(false);
    expect(barrierFulfilled.isRejected()).toBe(false);
    barrierFulfilled.resolve('Hello World!');
    expect(barrierFulfilled.isFulfilled()).toBe(true);
    expect(barrierFulfilled.isPending()).toBe(false);
    expect(barrierFulfilled.isRejected()).toBe(false);
    barrierFulfilled.resolve('Hello World 2!');
    expect(barrierFulfilled.isFulfilled()).toBe(true);
    expect(barrierFulfilled.isPending()).toBe(false);
    expect(barrierFulfilled.isRejected()).toBe(false);
    const fn1 = jest.fn();
    (async () => fn1(await barrierFulfilled.entry()))();
    setTimeout(() => expect(fn1).toBeCalledWith('Hello World!'));

    const barrierRejected = new PromiseBarrier();
    expect(barrierRejected.isPending()).toBe(true);
    expect(barrierRejected.isFulfilled()).toBe(false);
    expect(barrierRejected.isRejected()).toBe(false);
    await barrierRejected.reject('rejection reason');
    expect(barrierRejected.isRejected()).toBe(true);
    expect(barrierRejected.isPending()).toBe(false);
    expect(barrierRejected.isFulfilled()).toBe(false);
    barrierRejected.reject('rejection reason 2');
    const fn2 = jest.fn();
    (async () => {
        try {
            await barrierRejected.entry();
        } catch (e) {
            fn2(e);
        }
    })();
    setTimeout(() => expect(fn2).toBeCalledWith('rejection reason'));
});
