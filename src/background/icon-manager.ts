import {isThunderbird} from '../utils/platform';

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

    static setActive() {
        if (!chrome.browserAction.setIcon || isThunderbird) {
            // Fix for Firefox Android and Thunderbird.
            return;
        }
        chrome.browserAction.setIcon({
            path: IconManager.ICON_PATHS.active,
        });
    }

    static setInactive() {
        if (!chrome.browserAction.setIcon || isThunderbird) {
            // Fix for Firefox Android and Thunderbird.
            return;
        }
        chrome.browserAction.setIcon({
            path: IconManager.ICON_PATHS.inactive,
        });
    }

    static showBadge(text: string) {
        chrome.browserAction.setBadgeBackgroundColor({color: '#e96c4c'});
        chrome.browserAction.setBadgeText({text});
    }

    static hideBadge() {
        chrome.browserAction.setBadgeText({text: ''});
    }
}
