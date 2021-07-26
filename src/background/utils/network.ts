import {loadAsDataURL, loadAsText} from '../../utils/network';
import {getStringSize} from '../../utils/text';
import {getDuration} from '../../utils/time';

interface RequestParams {
    url: string;
    timeout?: number;
}

export async function readText(params: RequestParams): Promise<string> {
    return new Promise((resolve, reject) => {
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
    });
}

interface CacheRecord {
    expires: number;
    size: number;
    url: string;
    value: string;
}

class LimitedCacheStorage {
    static QUOTA_BYTES = ((navigator as any).deviceMemory || 4) * 16 * 1024 * 1024;
    static TTL = getDuration({minutes: 10});
    static ALARM_NAME = 'network';

    private bytesInUse = 0;
    private records = new Map<string, CacheRecord>();

    constructor() {
        chrome.alarms.onAlarm.addListener(async (alarm) => {
            if (alarm.name === LimitedCacheStorage.ALARM_NAME) {
                this.removeExpiredRecords();
            }
        });
        chrome.alarms.create(LimitedCacheStorage.ALARM_NAME, {periodInMinutes: 1});
    }

    has(url: string) {
        return this.records.has(url);
    }

    get(url: string) {
        if (this.records.has(url)) {
            const record = this.records.get(url);
            record.expires = Date.now() + LimitedCacheStorage.TTL;
            this.records.delete(url);
            this.records.set(url, record);
            return record.value;
        }
        return null;
    }

    set(url: string, value: string) {
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
    }
}

interface FetchRequestParameters {
    url: string;
    responseType: 'data-url' | 'text';
    mimeType?: string;
    origin?: string;
}

export function createFileLoader() {
    const caches = {
        'data-url': new LimitedCacheStorage(),
        'text': new LimitedCacheStorage(),
    };

    const loaders = {
        'data-url': loadAsDataURL,
        'text': loadAsText,
    };

    async function get({url, responseType, mimeType, origin}: FetchRequestParameters) {
        const cache = caches[responseType];
        const load = loaders[responseType];
        if (cache.has(url)) {
            return cache.get(url);
        }

        const data = await load(url, mimeType, origin);
        cache.set(url, data);
        return data;
    }

    return {get};
}
