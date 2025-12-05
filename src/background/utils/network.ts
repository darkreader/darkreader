import {loadAsDataURL, loadAsText} from '../../utils/network';
import {isXMLHttpRequestSupported, isFetchSupported} from '../../utils/platform';
import {getStringSize} from '../../utils/text';
import {getDuration} from '../../utils/time';

declare const __TEST__: boolean;

interface RequestParams {
    url: string;
    timeout?: number;
}

type FileLoaderResponse = {data: string; error?: Error} | {data?: string; error: Error};

export interface FileLoader {
    get: (fetchRequestParameters: FetchRequestParameters) => Promise<FileLoaderResponse>;
}

export async function readText(params: RequestParams): Promise<string> {
    return new Promise((resolve, reject) => {
        if (isXMLHttpRequestSupported) {
            // Use XMLHttpRequest if it is available
            const request = new XMLHttpRequest();
            request.overrideMimeType('text/plain');
            request.open('GET', params.url, true);
            request.onload = () => {
                if (request.status >= 200 && request.status < 300) {
                    resolve(request.responseText);
                } else {
                    reject(new Error(`${request.status}: ${request.statusText}`));
                }
            };
            request.onerror = () => reject(new Error(`${request.status}: ${request.statusText}`));
            if (params.timeout) {
                request.timeout = params.timeout;
                request.ontimeout = () => reject(new Error('File loading stopped due to timeout'));
            }
            request.send();
        } else if (isFetchSupported) {
            // XMLHttpRequest is not available in Service Worker contexts like
            // Manifest V3 background context
            let abortController: AbortController;
            let signal: AbortSignal | undefined;
            let timedOut = false;
            if (params.timeout) {
                abortController = new AbortController();
                signal = abortController.signal;
                setTimeout(() => {
                    abortController.abort();
                    timedOut = true;
                }, params.timeout);
            }

            fetch(params.url, {signal})
                .then((response) => {
                    if (response.status >= 200 && (response.status < 300)) {
                        resolve(response.text());
                    } else {
                        reject(new Error(`${response.status}: ${response.statusText}`));
                    }
                }).catch((error) => {
                    if (timedOut) {
                        reject(new Error('File loading stopped due to timeout'));
                    } else {
                        reject(error);
                    }
                });
        } else {
            reject(new Error(`Neither XMLHttpRequest nor Fetch API are accessible!`));
        }
    });
}

interface CacheRecord {
    expires: number;
    size: number;
    url: string;
    value: string;
}

class LimitedCacheStorage {
    // TODO: remove type cast after dependency update
    private static readonly QUOTA_BYTES = ((!__TEST__ && (navigator as any).deviceMemory) || 4) * 16 * 1024 * 1024;
    private static readonly TTL = getDuration({minutes: 10});
    private static readonly ALARM_NAME = 'network';

    private bytesInUse = 0;
    private records = new Map<string, CacheRecord>();
    private static alarmIsActive = false;

    constructor() {
        chrome.alarms.onAlarm.addListener(async (alarm) => {
            if (alarm.name === LimitedCacheStorage.ALARM_NAME) {
                // We schedule only one-time alarms, so once it goes off,
                // there are no more alarms scheduled.
                LimitedCacheStorage.alarmIsActive = false;
                this.removeExpiredRecords();
            }
        });
    }

    private static ensureAlarmIsScheduled(){
        if (!this.alarmIsActive) {
            chrome.alarms.create(LimitedCacheStorage.ALARM_NAME, {delayInMinutes: 1});
            this.alarmIsActive = true;
        }
    }

    has(url: string) {
        return this.records.has(url);
    }

    get(url: string) {
        if (this.records.has(url)) {
            const record = this.records.get(url)!;
            record.expires = Date.now() + LimitedCacheStorage.TTL;
            this.records.delete(url);
            this.records.set(url, record);
            return record.value;
        }
        return null;
    }

    set(url: string, value: string) {
        LimitedCacheStorage.ensureAlarmIsScheduled();

        const size = getStringSize(value);
        if (size > LimitedCacheStorage.QUOTA_BYTES) {
            return;
        }

        for (const [url, record] of this.records) {
            if (this.bytesInUse + size > LimitedCacheStorage.QUOTA_BYTES) {
                this.records.delete(url);
                this.bytesInUse -= record.size;
            } else {
                break;
            }
        }

        if (this.records.size === 0) {
            this.bytesInUse = 0;
        }

        const expires = Date.now() + LimitedCacheStorage.TTL;
        this.records.set(url, {url, value, size, expires});
        this.bytesInUse += size;
    }

    private removeExpiredRecords() {
        const now = Date.now();
        for (const [url, record] of this.records) {
            if (record.expires < now) {
                this.records.delete(url);
                this.bytesInUse -= record.size;
            } else {
                break;
            }
        }

        if (this.records.size === 0) {
            this.bytesInUse = 0;
        } else {
            LimitedCacheStorage.ensureAlarmIsScheduled();
        }
    }
}

function createLimiter() {
    const loadingUrls = new Set<string>();
    const awaitingUrls = new Map<string, Set<(response: FileLoaderResponse) => void>>();

    function loading(url: string) {
        const result = loadingUrls.has(url);
        loadingUrls.add(url);
        return result;
    }

    async function wait(url: string) {
        return new Promise<FileLoaderResponse>((resolve) => {
            if (!awaitingUrls.has(url)) {
                awaitingUrls.set(url, new Set());
            }
            awaitingUrls.get(url)?.add(resolve);
        });
    }

    async function loaded(url: string, data: string) {
        loadingUrls.delete(url);
        if (awaitingUrls.has(url)) {
            const response = {data};
            awaitingUrls.get(url)!.forEach((callback) => callback(response));
            awaitingUrls.delete(url);
        }
    }

    async function failed(url: string, error: Error) {
        loadingUrls.delete(url);
        if (awaitingUrls.has(url)) {
            const response = {error};
            awaitingUrls.get(url)!.forEach((callback) => callback(response));
            awaitingUrls.delete(url);
        }
    }

    return {loading, wait, loaded, failed};
}

export interface FetchRequestParameters {
    url: string;
    responseType: 'data-url' | 'text';
    mimeType?: string;
    origin?: string;
}

export function createFileLoader(): FileLoader {
    const caches = {
        'data-url': new LimitedCacheStorage(),
        'text': new LimitedCacheStorage(),
    };

    const loaders = {
        'data-url': loadAsDataURL,
        'text': loadAsText,
    };

    const limiters = {
        'data-url': createLimiter(),
        'text': createLimiter(),
    };

    async function get({url, responseType, mimeType, origin}: FetchRequestParameters): Promise<FileLoaderResponse> {
        const cache = caches[responseType];
        const load = loaders[responseType];
        const limiter = limiters[responseType];
        if (cache.has(url)) {
            const data = cache.get(url)!;
            return {data};
        }

        if (limiter.loading(url)) {
            return limiter.wait(url);
        }

        try {
            const data = await load(url, mimeType, origin);
            cache.set(url, data);
            limiter.loaded(url, data);
            return {data};
        } catch (error) {
            limiter.failed(url, error);
            return {error};
        }
    }

    return {get};
}
