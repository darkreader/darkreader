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

    await barrier.resolve(2);
    expect(fn1).toBeCalledTimes(1);
    expect(fn2).toBeCalledWith(2);
});

test('Promise barrier utility: awaiting for barrier after it was settled', async () => {
    const barrierResolved = new PromiseBarrier();
    const promise1 = barrierResolved.resolve('Hello World!');
    const fn1 = jest.fn();
    (async () => fn1(await barrierResolved.entry()))();
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
    const barrierResolved = new PromiseBarrier();
    barrierResolved.resolve('Hello World!');
    barrierResolved.resolve('Hello World 2!');
    const fn1 = jest.fn();
    (async () => fn1(await barrierResolved.entry()))();
    setTimeout(() => expect(fn1).toBeCalledWith('Hello World!'));

    const barrierRejected = new PromiseBarrier();
    await barrierRejected.reject('rejection reason');
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
