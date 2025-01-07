import {isFirefox, isEdge} from '../../utils/platform';
import {getDuration} from '../../utils/time';
import {isPDF} from '../../utils/url';

export function canInjectScript(url: string | null | undefined): boolean {
    if (url === 'about:blank') {
        return false;
    }
    if (isFirefox) {
        return Boolean(url
            && !url.startsWith('about:')
            && !url.startsWith('moz')
            && !url.startsWith('view-source:')
            && !url.startsWith('resource:')
            && !url.startsWith('chrome:')
            && !url.startsWith('jar:')
            && !url.startsWith('https://addons.mozilla.org/')
            && !isPDF(url)
        );
    }
    if (isEdge) {
        return Boolean(url
            && !url.startsWith('chrome')
            && !url.startsWith('data')
            && !url.startsWith('devtools')
            && !url.startsWith('edge')
            && !url.startsWith('https://chrome.google.com/webstore')
            && !url.startsWith('https://chromewebstore.google.com/')
            && !url.startsWith('https://microsoftedge.microsoft.com/addons')
            && !url.startsWith('view-source')
        );
    }
    return Boolean(url
        && !url.startsWith('chrome')
        && !url.startsWith('https://chrome.google.com/webstore')
        && !url.startsWith('https://chromewebstore.google.com/')
        && !url.startsWith('data')
        && !url.startsWith('devtools')
        && !url.startsWith('view-source')
    );
}

export async function readSyncStorage<T extends {[key: string]: any}>(defaults: T): Promise<T | null> {
    return new Promise<T | null>((resolve) => {
        chrome.storage.sync.get(null, (sync: any) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                resolve(null);
                return;
            }

            for (const key in sync) {
                // Just to be sure: https://github.com/darkreader/darkreader/issues/7270
                // The value of sync[key] shouldn't be null.
                if (!sync[key]) {
                    continue;
                }
                const metaKeysCount = sync[key].__meta_split_count;
                if (!metaKeysCount) {
                    continue;
                }

                let string = '';
                for (let i = 0; i < metaKeysCount; i++) {
                    string += sync[`${key}_${i.toString(36)}`];
                    delete sync[`${key}_${i.toString(36)}`];
                }
                try {
                    sync[key] = JSON.parse(string);
                } catch (error) {
                    console.error(`sync[${key}]: Could not parse record from sync storage: ${string}`);
                    resolve(null);
                    return;
                }
            }

            sync = {
                ...defaults,
                ...sync,
            };

            resolve(sync);
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
        // The maximum size of any one item that each extension is allowed to store in the sync storage area,
        // as measured by the JSON stringification of the item's value plus the length of its key.
        // Source: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync
        const totalLength = string.length + key.length;
        if (totalLength > chrome.storage.sync.QUOTA_BYTES_PER_ITEM) {
            // This length limit permits us to store up to 1000 = (parseInt('rr', 36) + 1) records.
            const maxLength = chrome.storage.sync.QUOTA_BYTES_PER_ITEM - key.length - 1 - 2;
            const minimalKeysNeeded = Math.ceil(string.length / maxLength);
            for (let i = 0; i < minimalKeysNeeded; i++) {
                (values as any)[`${key}_${i.toString(36)}`] = string.substring(i * maxLength, (i + 1) * maxLength);
            }
            (values as any)[key] = {
                __meta_split_count: minimalKeysNeeded,
            };
        }
    }
    return values;
}

export async function writeSyncStorage<T extends {[key: string]: any}>(values: T): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const packaged = prepareSyncStorage(values);
        chrome.storage.sync.set(packaged, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            resolve();
        });
    });
}

export async function writeLocalStorage<T extends {[key: string]: any}>(values: T): Promise<void> {
    return new Promise<void>((resolve) => {
        chrome.storage.local.set(values, () => {
            resolve();
        });
    });
}

export async function removeSyncStorage(keys: string[]): Promise<void> {
    return new Promise<void>((resolve) => {
        chrome.storage.sync.remove(keys, () => {
            resolve();
        });
    });
}

export async function removeLocalStorage(keys: string[]): Promise<void> {
    return new Promise<void>((resolve) => {
        chrome.storage.local.remove(keys, () => {
            resolve();
        });
    });
}

export async function getCommands(): Promise<chrome.commands.Command[]> {
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

export function keepListeningToEvents(): () => void {
    let intervalId = 0;
    const keepHopeAlive = () => {
        intervalId = setInterval(chrome.runtime.getPlatformInfo, getDuration({seconds: 10}));
    };
    chrome.runtime.onStartup.addListener(keepHopeAlive);
    keepHopeAlive();
    const stopListening = () => {
        clearInterval(intervalId);
        chrome.runtime.onStartup.removeListener(keepHopeAlive);
    };
    return stopListening;
}
