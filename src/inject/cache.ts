import type {ImageDetails} from './dynamic-theme/image';

const STORAGE_KEY_WAS_ENABLED_FOR_HOST = '__darkreader__wasEnabledForHost';
const STORAGE_KEY_IMAGE_DETAILS = '__darkreader__imageDetails_v1';
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

let imageCacheTimeout: number = 0;

export function writeImageDetailCache(imageDetailsCache: Map<string, ImageDetails>): void {
    clearTimeout(imageCacheTimeout);
    imageCacheTimeout = setTimeout(() => {
        const cache = {} as Record<string, ImageDetails>;
        imageDetailsCache.forEach((data, url) => {
            if (url && url.startsWith('https://')) {
                cache[url] = data;
            }
        });
        try {
            sessionStorage.setItem(STORAGE_KEY_IMAGE_DETAILS, JSON.stringify(cache));
        } catch (err) {
        }
    }, 1000);
}

export function readImageDetailCache(): Record<string, ImageDetails> | null {
    try {
        const json = sessionStorage.getItem(STORAGE_KEY_IMAGE_DETAILS);
        if (json) {
            return JSON.parse(json);
        }
    } catch (err) {
    }
    return null;
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
