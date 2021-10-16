import {isPDF} from '../../utils/url';
import {isFirefox, isEdge} from '../../utils/platform';
import {Mutex} from '../../utils/mutex';

declare const browser: {
    commands: {
        update({name, shortcut}: chrome.commands.Command): void;
    };
};

export function canInjectScript(url: string) {
    if (isFirefox) {
        return (url
            && !url.startsWith('about:')
            && !url.startsWith('moz')
            && !url.startsWith('view-source:')
            && !url.startsWith('https://addons.mozilla.org/')
            && !isPDF(url)
        );
    }
    if (isEdge) {
        return (url
            && !url.startsWith('chrome')
            && !url.startsWith('data')
            && !url.startsWith('devtools')
            && !url.startsWith('edge')
            && !url.startsWith('https://chrome.google.com/webstore')
            && !url.startsWith('https://microsoftedge.microsoft.com/addons')
            && !url.startsWith('view-source')
        );
    }
    return (url
        && !url.startsWith('chrome')
        && !url.startsWith('https://chrome.google.com/webstore')
        && !url.startsWith('data')
        && !url.startsWith('devtools')
        && !url.startsWith('view-source')
    );
}

const mutexStorageWriting = new Mutex();

const metaVariantOfKey = (key: string) => `${key}_meta`;

export async function readSyncStorage<T extends {[key: string]: any}>(defaults: T): Promise<T> {
    return new Promise<T>((resolve) => {
        chrome.storage.sync.get(null, (sync: any) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                resolve(defaults);
                return;
            }

            sync = {
                ...defaults,
                ...sync
            };

            const meta: string[] = [];
            const metaKeys: Array<{key: keyof T; minimalKeysNeeded: number}> = [];
            for (const key in sync) {
                const currMeta = sync[metaVariantOfKey(key)];
                if (currMeta) {
                    metaKeys.push({key, minimalKeysNeeded: currMeta.len});
                    for (let i = 0; i < currMeta.minimalKeysNeeded; i++) {
                        meta.push(`${key}_${i}`);
                    }
                    break;
                } else {
                    delete sync[metaVariantOfKey(key)];
                }
            }

            // If there are no split records, we can resolve already.
            if (meta.length === 0) {
                resolve(sync);
                return;
            }

            // Query the split record values and stitch them together.
            chrome.storage.sync.get(meta, (sync2: T) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    resolve(defaults);
                    return;
                }

                for (const {key, minimalKeysNeeded} of metaKeys) {
                    let string = '';
                    for (let i = 0; i < minimalKeysNeeded; i++) {
                        string += sync2[`${key}_${i}`];
                    }
                    sync[key] = JSON.parse(string);
                }

                resolve(sync);
            });
        });
    });
}

export async function readLocalStorage<T extends {[key: string]: any}>(defaults: T): Promise<T> {
    return new Promise<T>((resolve) => {
        chrome.storage.local.get(defaults, (local: T) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                resolve(defaults);
                return;
            }
            resolve(local);
        });
    });
}

function prepareSyncStorage<T extends {[key: string]: any}>(values: T): {[key: string]: any} {
    for (const key in values) {
        const value = values[key];
        const string = JSON.stringify(value);
        const totalLength = string.length + key.length;
        if (totalLength > chrome.storage.sync.QUOTA_BYTES_PER_ITEM) {
            const maxLength = chrome.storage.sync.QUOTA_BYTES_PER_ITEM - key.length - 3;
            const minimalKeysNeeded = Math.ceil(string.length / maxLength);
            for (let i = 0; i < minimalKeysNeeded; i++) {
                (values as any)[`${key}_${i}`] = string.substring(i * maxLength, (i + 1) * maxLength);
            }
            (values as any)[metaVariantOfKey(key)] = {
                len: minimalKeysNeeded
            };
            values[key] = undefined;
        }
    }
    return values;
}

export async function writeSyncStorage<T extends {[key: string]: any}>(values: T): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        const packaged = prepareSyncStorage(values);
        await mutexStorageWriting.lock();
        chrome.storage.sync.set(packaged, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                mutexStorageWriting.unlock();
                return;
            }
            resolve();
            setTimeout(() => mutexStorageWriting.unlock(), 500);
        });
    });
}

export async function writeLocalStorage<T extends {[key: string]: any}>(values: T): Promise<void> {
    return new Promise<void>(async (resolve) => {
        await mutexStorageWriting.lock();
        chrome.storage.local.set(values, () => {
            resolve();
            setTimeout(() => mutexStorageWriting.unlock(), 500);
        });
    });
}

export const subscribeToOuterSettingsChange = (callback: () => void) => {
    chrome.storage.onChanged.addListener(() => {
        if (!mutexStorageWriting.isLocked()) {
            callback();
        }
    });
};

export async function getCommands() {
    return new Promise<chrome.commands.Command[]>((resolve) => {
        if (!chrome.commands) {
            resolve([]);
            return;
        }
        chrome.commands.getAll((commands) => {
            if (commands) {
                resolve(commands);
            } else {
                resolve([]);
            }
        });
    });
}

export function setShortcut(command: string, shortcut: string) {
    if (typeof browser !== 'undefined' && browser.commands && browser.commands.update) {
        browser.commands.update({name: command, shortcut});
    }
}
