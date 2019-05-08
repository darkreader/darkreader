import {isHalloween} from '../utils/time';

const ICON_PATHS = {
    active_19: '../icons/amagi_icon.png',
    active_38: '../icons/amagi_icon.png',
    inactive_19: '../icons/amagi_icon.png',
    inactive_38: '../icons/amagi_icon.png',
    pumpkin_19: '../icons/amagi_icon.png',
    pumpkin_38: '../icons/amagi_icon.png',
};

export default class IconManager {
    constructor() {
        this.setActive();
    }

    setActive() {
        if (!chrome.browserAction.setIcon) {
            // Fix for Firefox Android
            return;
        }
        if (isHalloween()) {
            chrome.browserAction.setIcon({
                path: {
                    '19': ICON_PATHS.pumpkin_19,
                    '38': ICON_PATHS.pumpkin_38,
                }
            });
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
        if (!chrome.browserAction.setIcon) {
            // Fix for Firefox Android
            return;
        }
        chrome.browserAction.setIcon({
            path: {
                '19': ICON_PATHS.inactive_19,
                '38': ICON_PATHS.inactive_38
            }
        });
    }

    notifyAboutReleaseNotes(count: number) {
        chrome.browserAction.setBadgeBackgroundColor({
            color: '#e96c4c',
        });
        chrome.browserAction.setBadgeText({
            text: String(count)
        });
    }

    stopNotifyingAboutReleaseNotes() {
        chrome.browserAction.setBadgeText({
            text: ''
        });
    }
}
