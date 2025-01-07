import {isNonPersistent} from '../utils/platform';

declare const __THUNDERBIRD__: boolean;

interface IconState {
    badgeText: string;
    active: boolean;
}

interface IconOptions {
    colorScheme?: 'dark' | 'light';
    isActive?: boolean;
    tabId?: number;
}

export default class IconManager {
    private static readonly ICON_PATHS = {
        activeDark: {
            19: '../icons/dr_active_19.png',
            38: '../icons/dr_active_38.png',
        },
        activeLight: {
            19: '../icons/dr_active_light_19.png',
            38: '../icons/dr_active_light_38.png',
        },
        inactiveDark: {
            19: '../icons/dr_inactive_dark_19.png',
            38: '../icons/dr_inactive_dark_38.png',
        },
        inactiveLight: {
            19: '../icons/dr_inactive_light_19.png',
            38: '../icons/dr_inactive_light_38.png',
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


    static setIcon({isActive = this.iconState.active, colorScheme = 'dark', tabId}: IconOptions): void {
        if (__THUNDERBIRD__ || !chrome.browserAction.setIcon) {
            // Fix for Firefox Android and Thunderbird.
            return;
        }

        this.iconState.active = isActive;

        let path = this.ICON_PATHS.activeDark;
        if (isActive) {
            path = colorScheme === 'dark' ? IconManager.ICON_PATHS.activeDark : IconManager.ICON_PATHS.activeLight;
        } else {
            path = colorScheme === 'dark' ? IconManager.ICON_PATHS.inactiveDark : IconManager.ICON_PATHS.inactiveLight;
        }

        if (tabId) {
            chrome.browserAction.setIcon({tabId, path});
        } else {
            chrome.browserAction.setIcon({path});
            IconManager.handleUpdate();
        }
    }

    static showBadge(text: string): void {
        IconManager.iconState.badgeText = text;
        chrome.browserAction.setBadgeBackgroundColor({color: '#e96c4c'});
        chrome.browserAction.setBadgeText({text});
        IconManager.handleUpdate();
    }

    static hideBadge(): void {
        IconManager.iconState.badgeText = '';
        chrome.browserAction.setBadgeText({text: ''});
        IconManager.handleUpdate();
    }
}
