const STORAGE_KEY_WAS_ENABLED_FOR_HOST = '__darkreader__wasEnabledForHost';

export function wasEnabledForHost(): boolean | null {
    try {
        const value = sessionStorage.getItem(STORAGE_KEY_WAS_ENABLED_FOR_HOST);
        if (value === 'true') {
            return true;
        }
        if (value === 'false') {
            return false;
        }
        return null;
    } catch (err) {
        return null;
    }
}

export function writeEnabledForHost(value: boolean): void {
    try {
        sessionStorage.setItem(STORAGE_KEY_WAS_ENABLED_FOR_HOST, value ? 'true' : 'false');
    } catch (err) {
    }
}
