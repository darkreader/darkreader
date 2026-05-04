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
    return readLocalStorage(defaults);
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
    return writeLocalStorage(values);
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
