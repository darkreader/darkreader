import type {ImageDetails} from './dynamic-theme/image';

const STORAGE_KEY_WAS_ENABLED_FOR_HOST = '__darkreader__wasEnabledForHost';
const STORAGE_KEY_IMAGE_DETAILS_LIST = '__darkreader__imageDetails_v2_list';
const STORAGE_KEY_IMAGE_DETAILS_PREFIX = '__darkreader__imageDetails_v2_';
const STORAGE_KEY_CSS_FETCH_PREFIX = '__darkreader__cssFetch_';

export function wasEnabledForHost(): boolean | null {
    try {
        const value = sessionStorage.getItem(STORAGE_KEY_WAS_ENABLED_FOR_HOST);
        if (value === 'true') {
            return true;
        }
        if (value === 'false') {
            return false;
        }
    } catch (err) {
    }
    return null;
}

export function writeEnabledForHost(value: boolean): void {
    try {
        sessionStorage.setItem(STORAGE_KEY_WAS_ENABLED_FOR_HOST, value ? 'true' : 'false');
    } catch (err) {
    }
}

let imageCacheTimeout: any = 0;
const imageDetailsCacheQueue = new Map<string, ImageDetails>();
const cachedImageUrls: string[] = [];

function writeImageDetailsQueue() {
    imageDetailsCacheQueue.forEach((details, url) => {
        if (url && url.startsWith('https://')) {
            try {
                const json = JSON.stringify(details);
                sessionStorage.setItem(`${STORAGE_KEY_IMAGE_DETAILS_PREFIX}${url}`, json);
                cachedImageUrls.push(url);
            } catch (err) {
            }
        }
    });
    imageDetailsCacheQueue.clear();
    sessionStorage.setItem(STORAGE_KEY_IMAGE_DETAILS_LIST, JSON.stringify(cachedImageUrls));
}

export function writeImageDetailsCache(url: string, imageDetails: ImageDetails): void {
    if (!url || !url.startsWith('https://')) {
        return;
    }
    imageDetailsCacheQueue.set(url, imageDetails);
    clearTimeout(imageCacheTimeout);
    imageCacheTimeout = setTimeout(writeImageDetailsQueue, 1000);
}

export function readImageDetailsCache(targetMap: Map<string, ImageDetails>): void {
    try {
        const jsonList = sessionStorage.getItem(STORAGE_KEY_IMAGE_DETAILS_LIST);
        if (!jsonList) {
            return;
        }
        const list: string[] = JSON.parse(jsonList);
        list.forEach((url) => {
            const json = sessionStorage.getItem(`${STORAGE_KEY_IMAGE_DETAILS_PREFIX}${url}`);
            if (json) {
                const details = JSON.parse(json);
                targetMap.set(url, details);
            }
        });
    } catch (err) {
    }
}

export function writeCSSFetchCache(url: string, cssText: string): void {
    const key = `${STORAGE_KEY_CSS_FETCH_PREFIX}${url}`;
    try {
        sessionStorage.setItem(key, cssText);
    } catch (err) {
    }
}

export function readCSSFetchCache(url: string): string | null {
    const key = `${STORAGE_KEY_CSS_FETCH_PREFIX}${url}`;
    try {
        return sessionStorage.getItem(key) ?? null;
    } catch (err) {
    }
    return null;
}
