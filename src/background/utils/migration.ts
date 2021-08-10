import {isChromium} from '../../utils/platform';

export function isNonPersistent() {
    if (!isChromium) {
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
