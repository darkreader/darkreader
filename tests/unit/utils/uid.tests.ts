import {randomFillSync} from 'crypto';

import {generateUID} from '../../../src/utils/uid';

test('Unique identifier generation (popyfilled)', () => {
    if ('crypto' in globalThis) {
        return;
    }

    // Make sure we are not messing up global context for somebody else
    expect('crypto' in globalThis).toEqual(false);

    // Create a shim for crypto API
    // TODO: remove any cast once type declarations are updated
    const shim1 = jest.fn();
    globalThis.crypto = {
        getRandomValues: (buffer: Uint8Array) => {
            shim1();
            return randomFillSync(buffer);
        },
    } as any;
    const uid1 = generateUID();
    expect(/^[a-f0-9]{32}$/.test(uid1)).toEqual(true);
    expect(shim1).toHaveBeenCalled();

    const shim2 = jest.fn();
    globalThis.crypto = {
        randomUUID: () => {
            shim2();
            return 'a19cc926-bf7f-4d5f-bf9c-202bc7a4c7c6';
        },
    } as any;
    expect(generateUID()).toEqual('a19cc926bf7f4d5fbf9c202bc7a4c7c6');
    expect(shim2).toHaveBeenCalled();

    delete (globalThis as any).crypto;
});

test('Unique identifier generation (NodeJS 19+)', () => {
    if (!('crypto' in globalThis)) {
        return;
    }

    // Make sure crypto.randomUUID() is actually supported
    expect('crypto' in globalThis && 'randomUUID' in crypto).toEqual(true);

    const uid1 = generateUID();
    expect(/^[a-f0-9]{32}$/.test(uid1)).toEqual(true);
});
