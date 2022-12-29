import {isNonPersistent} from '../utils/platform';

declare const __THUNDERBIRD__: boolean;

interface IconState {
    text: string;
    inactive: boolean;
}

export default class IconManager {
    private static ICON_PATHS = {
        active: {
            19: '../icons/dr_active_19.png',
            38: '../icons/dr_active_38.png',
        },
        inactive: {
            19: '../icons/dr_inactive_19.png',
            38: '../icons/dr_inactive_38.png',
        },
    };

    private static LOCAL_STORAGE_KEY_ICON = 'icon-off';
    private static LOCAL_STORAGE_KEY_BADGE = 'icon-badge';

    private static iconState: IconState = {
        text: '',
        inactive: false,
    };

    private static onStartup() {
        chrome.storage.local.get([this.LOCAL_STORAGE_KEY_ICON, this.LOCAL_STORAGE_KEY_BADGE], (data) => {
            const inactive: boolean = data[this.LOCAL_STORAGE_KEY_ICON];
            const text: string = data[this.LOCAL_STORAGE_KEY_BADGE];
            if (inactive) {
                IconManager.iconState.inactive = true;
                chrome.browserAction.setIcon({
                    path: IconManager.ICON_PATHS.inactive,
                });
            }
            if (text) {
                IconManager.iconState.text = text;
                chrome.browserAction.setBadgeBackgroundColor({color: '#e96c4c'});
                chrome.browserAction.setBadgeText({text});
            }
        });
    }

    /**
     * This method registers onStartup listener only if we are in non-persistent world and
     * icon is in non-default configuration.
     */
    private static handleUpdate() {
        if (!isNonPersistent) {
            return;
        }
        // Note: values which are undefined are just removed from storage.
        const storage = {
            [this.LOCAL_STORAGE_KEY_BADGE]: IconManager.iconState.text || undefined,
            [this.LOCAL_STORAGE_KEY_ICON]: IconManager.iconState.inactive || undefined,
        }
        if (IconManager.iconState.text !== '' || !IconManager.iconState.inactive) {
            chrome.runtime.onStartup.addListener(IconManager.onStartup);
        } else {
            chrome.runtime.onStartup.removeListener(IconManager.onStartup);
        }
        chrome.storage.local.set(storage);
    }

    static setActive() {
        if (__THUNDERBIRD__ || !chrome.browserAction.setIcon) {
            // Fix for Firefox Android and Thunderbird.
            return;
        }
        IconManager.iconState.inactive = false;
        chrome.browserAction.setIcon({
            path: IconManager.ICON_PATHS.active,
        });
        IconManager.handleUpdate();
    }

    static setInactive() {
        if (__THUNDERBIRD__ || !chrome.browserAction.setIcon) {
            // Fix for Firefox Android and Thunderbird.
            return;
        }
        IconManager.iconState.inactive = true;
        chrome.browserAction.setIcon({
            path: IconManager.ICON_PATHS.inactive,
        });
        IconManager.handleUpdate();
    }

    static showBadge(text: string) {
        IconManager.iconState.text = text;
        chrome.browserAction.setBadgeBackgroundColor({color: '#e96c4c'});
        chrome.browserAction.setBadgeText({text});
        IconManager.handleUpdate();
    }

    static hideBadge() {
        IconManager.iconState.text = '';
        chrome.browserAction.setBadgeText({text: ''});
        IconManager.handleUpdate();
    }
}
