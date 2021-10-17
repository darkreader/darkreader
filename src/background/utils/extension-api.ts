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

export async function readSyncStorage<T extends {[key: string]: any}>(defaults: T): Promise<T> {
    return new Promise<T>((resolve) => {
        chrome.storage.sync.get(defaults, (sync: T) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                resolve(defaults);
                return;
            }
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

export async function writeSyncStorage<T extends {[key: string]: any}>(values: T): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        await mutexStorageWriting.lock();
        chrome.storage.sync.set(values, () => {
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
