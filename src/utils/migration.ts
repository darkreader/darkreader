declare const __CHROMIUM_MV2__: boolean;
declare const __CHROMIUM_MV3__: boolean;

export function isNonPersistent() {
    if (__CHROMIUM_MV3__) {
        return true;
    }
    if (!__CHROMIUM_MV2__) {
        return false;
    }
    const background = chrome.runtime.getManifest().background;
    if ('persistent' in background) {
        return background.persistent === false;
    }
    if ('service_worker' in background) {
        return true;
    }
}
