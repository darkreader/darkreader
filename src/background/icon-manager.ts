import {isNonPersistent} from '../utils/platform';

declare const __THUNDERBIRD__: boolean;

interface IconState {
    badgeText: string;
    active: boolean;
}

export default class IconManager {
    private static readonly ICON_PATHS = {
        active: {
            19: '../icons/dr_active_19.png',
            38: '../icons/dr_active_38.png',
        },
        inactive: {
            19: '../icons/dr_inactive_19.png',
            38: '../icons/dr_inactive_38.png',
        },
    };

    private static readonly iconState: IconState = {
        badgeText: '',
        active: true,
    };

    private static onStartup() {
        /**
         * This empty listener invokes extension background if extension has non-default
         * icon or badge. It is empty because all icon customizations will be initiated by
         * Extension class.
         * TODO: eventually, avoid running the whole Extension class on startup.
         */
    }

    /**
     * This method registers onStartup listener only if we are in non-persistent world and
     * icon is in non-default configuration.
     */
    private static handleUpdate() {
        if (!isNonPersistent) {
            return;
        }
        if (IconManager.iconState.badgeText !== '' || !IconManager.iconState.active) {
            chrome.runtime.onStartup.addListener(IconManager.onStartup);
        } else {
            chrome.runtime.onStartup.removeListener(IconManager.onStartup);
        }
    }

    static setActive() {
        if (__THUNDERBIRD__ || !chrome.browserAction.setIcon) {
            // Fix for Firefox Android and Thunderbird.
            return;
        }
        IconManager.iconState.active = true;
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
        IconManager.iconState.active = false;
        chrome.browserAction.setIcon({
            path: IconManager.ICON_PATHS.inactive,
        });
        IconManager.handleUpdate();
    }

    static showBadge(text: string) {
        IconManager.iconState.badgeText = text;
        chrome.browserAction.setBadgeBackgroundColor({color: '#e96c4c'});
        chrome.browserAction.setBadgeText({text});
        IconManager.handleUpdate();
    }

    static hideBadge() {
        IconManager.iconState.badgeText = '';
        chrome.browserAction.setBadgeText({text: ''});
        IconManager.handleUpdate();
    }
}
