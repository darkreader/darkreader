import {isThunderbird} from '../utils/platform';

const ICON_PATHS = {
    active_19: '../icons/dr_active_19.png',
    active_38: '../icons/dr_active_38.png',
    inactive_19: '../icons/dr_inactive_19.png',
    inactive_38: '../icons/dr_inactive_38.png',
};

export default class IconManager {
    setActive() {
        if (!chrome.browserAction.setIcon || isThunderbird) {
            // Fix for Firefox Android and Thunderbird.
            return;
        }
        chrome.browserAction.setIcon({
            path: {
                '19': ICON_PATHS.active_19,
                '38': ICON_PATHS.active_38
            }
        });
    }

    setInactive() {
        if (!chrome.browserAction.setIcon || isThunderbird) {
            // Fix for Firefox Android and Thunderbird.
            return;
        }
        chrome.browserAction.setIcon({
            path: {
                '19': ICON_PATHS.inactive_19,
                '38': ICON_PATHS.inactive_38
            }
        });
    }

    showBadge(text: string) {
        chrome.browserAction.setBadgeBackgroundColor({color: '#e96c4c'});
        chrome.browserAction.setBadgeText({text});
    }

    hideBadge() {
        chrome.browserAction.setBadgeText({text: ''});
    }
}
