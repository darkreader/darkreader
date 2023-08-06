import { m } from 'malevic';
import { Toggle } from '../../../controls';
import { getLocalMessage } from '../../../../utils/locales';
import type { ExtWrapper, UserSettings } from '../../../../definitions';
import SettingsIcon from '../../main-page/settings-icon';
import SunMoonIcon from '../../main-page/sun-moon-icon';
import SystemIcon from '../../main-page/system-icon';
import WatchIcon from '../../main-page/watch-icon';
import SiteToggle from '../site-toggle';
import MoreNewHighlight from './more-new-highlight';
import MoreSiteSettings from './more-site-settings';
import MoreToggleSettings from './more-toggle-settings';
import { AutomationMode } from '../../../../utils/automation';
import { isLocalFile } from '../../../../utils/url';
import { isChromium } from '../../../../utils/platform';
import { HOMEPAGE_URL } from '../../../../utils/links';

declare const __CHROMIUM_MV3__: boolean;

type HeaderProps = ExtWrapper & {
    onMoreSiteSettingsClick: () => void;
    onMoreToggleSettingsClick: () => void;
};

function Header({
    data,
    actions,
    onMoreSiteSettingsClick,
    onMoreToggleSettingsClick,
}: HeaderProps) {
    function toggleExtension(enabled: UserSettings['enabled']) {
        actions.changeSettings({
            enabled,
            automation: { ...data.settings.automation, ...{ enabled: false } },
        });
    }

    const tab = data.activeTab;
    const isFile = isChromium && isLocalFile(tab.url);
    const isAutomation = data.settings.automation.enabled;
    const isTimeAutomation =
        data.settings.automation.mode === AutomationMode.TIME;
    const isLocationAutomation =
        data.settings.automation.mode === AutomationMode.LOCATION;
    const now = new Date();

    const automationMessage = isAutomation
        ? isTimeAutomation
            ? data.isEnabled
                ? getLocalMessage('auto_night_time')
                : getLocalMessage('auto_day_time')
            : isLocationAutomation
            ? data.isEnabled
                ? getLocalMessage('auto_night_at_location')
                : getLocalMessage('auto_day_at_location')
            : data.isEnabled
            ? getLocalMessage('auto_system_is_dark')
            : getLocalMessage('auto_system_is_light')
        : getLocalMessage('configure_automation');

    const isProtected =
        !isFile && ((!__CHROMIUM_MV3__ && !tab.isInjected) || tab.isProtected);
    const isProtectedFile = isFile && !data.isAllowedFileSchemeAccess;
    const isSiteEnabled = !(isProtected || isProtectedFile || tab.isInDarkList);

    const siteToggleMessage = isProtected
        ? getLocalMessage('page_protected')
        : isFile && !data.isAllowedFileSchemeAccess
        ? getLocalMessage('local_files_forbidden')
        : tab.isInDarkList
        ? getLocalMessage('page_in_dark_list')
        : tab.isDarkThemeDetected
        ? getLocalMessage('dark_theme_detected')
        : getLocalMessage('configure_site_toggle');

    return (
        <header class='header'>
            <a
                class='header__logo'
                href={HOMEPAGE_URL}
                target='_blank'
                rel='noopener noreferrer'
            >
                Dark Reader
            </a>
            <div class='header__control header__site-toggle'>
                <SiteToggle data={data} actions={actions} />
                <span
                    class={{
                        'header__more-settings-button': true,
                        'header__more-settings-button--off': !isSiteEnabled,
                    }}
                    onclick={onMoreSiteSettingsClick}
                >
                    <SettingsIcon class='header__more-settings-button__icon' />
                    {siteToggleMessage}
                </span>
            </div>
            <div class='header__control header__app-toggle'>
                <Toggle
                    checked={data.isEnabled}
                    labelOn={getLocalMessage('on')}
                    labelOff={getLocalMessage('off')}
                    onChange={toggleExtension}
                />
                <span
                    class={{
                        'header__more-settings-button': true,
                        'header__more-settings-button--off': !data.isEnabled,
                    }}
                    onclick={onMoreToggleSettingsClick}
                >
                    <SettingsIcon class='header__more-settings-button__icon' />
                    {automationMessage}
                </span>
                <span
                    class={{
                        'header__app-toggle__time': true,
                        'header__app-toggle__time--active': isAutomation,
                    }}
                >
                    {isTimeAutomation ? (
                        <WatchIcon
                            hours={now.getHours()}
                            minutes={now.getMinutes()}
                        />
                    ) : isLocationAutomation ? (
                        <SunMoonIcon
                            date={now}
                            latitude={data.settings.location.latitude!}
                            longitude={data.settings.location.longitude!}
                        />
                    ) : (
                        <SystemIcon />
                    )}
                </span>
            </div>
        </header>
    );
}

export {
    Header,
    MoreNewHighlight,
    MoreSiteSettings,
    MoreToggleSettings, // TODO: Implement portals to place elements into <body>.
};
