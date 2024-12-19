import {m} from 'malevic';

import type {ExtensionData, ExtWrapper} from '../../../../definitions';
import {AutomationMode} from '../../../../utils/automation';
import {HOMEPAGE_URL} from '../../../../utils/links';
import {getLocalMessage} from '../../../../utils/locales';
import {isChromium} from '../../../../utils/platform';
import {isLocalFile} from '../../../../utils/url';
import {Toggle} from '../../../controls';
import {SettingsIcon, SunMoonIcon, SystemIcon, WatchIcon} from '../../../icons';
import SiteToggle from '../site-toggle';

import MoreNewHighlight from './more-new-highlight';
import MoreSiteSettings from './more-site-settings';
import MoreToggleSettings from './more-toggle-settings';


declare const __CHROMIUM_MV3__: boolean;

type HeaderProps = ExtWrapper & {
    onMoreSiteSettingsClick: () => void;
    onMoreToggleSettingsClick: () => void;
};

export function getAutomationMessage(props: {data: ExtensionData}) {
    const {data} = props;
    const isAutomation = data.settings.automation.enabled;
    const isTimeAutomation = data.settings.automation.mode === AutomationMode.TIME;
    const isLocationAutomation = data.settings.automation.mode === AutomationMode.LOCATION;
    return isAutomation
        ? (
            isTimeAutomation
                ? (data.isEnabled ? getLocalMessage('auto_night_time') : getLocalMessage('auto_day_time'))
                : isLocationAutomation
                    ? data.isEnabled ? getLocalMessage('auto_night_at_location') : getLocalMessage('auto_day_at_location')
                    : data.isEnabled ? getLocalMessage('auto_system_is_dark') : getLocalMessage('auto_system_is_light')
        )
        : getLocalMessage('configure_automation');
}

export function toggleExtension(props: ExtWrapper, enabled: boolean) {
    const {data, actions} = props;
    actions.changeSettings({
        enabled,
        automation: {...data.settings.automation, ...{enabled: false}},
    });
}

export function getSiteToggleMessage(props: ExtWrapper) {
    const {data} = props;
    const tab = data.activeTab;
    const isFile = isChromium && isLocalFile(tab.url);

    const isProtected = !isFile && ((!__CHROMIUM_MV3__ && !tab.isInjected) || tab.isProtected);

    return isProtected ?
        getLocalMessage('page_protected')
        : isFile && !data.isAllowedFileSchemeAccess ?
            getLocalMessage('local_files_forbidden')
            : tab.isInDarkList ?
                getLocalMessage('page_in_dark_list')
                : tab.isDarkThemeDetected ?
                    getLocalMessage('dark_theme_detected')
                    : getLocalMessage('configure_site_toggle');
}

function Header(props: HeaderProps) {
    const {data, actions, onMoreSiteSettingsClick, onMoreToggleSettingsClick} = props;

    function toggleApp(enabled: boolean) {
        toggleExtension(props, enabled);
    }

    const tab = data.activeTab;
    const isFile = isChromium && isLocalFile(tab.url);
    const isAutomation = data.settings.automation.enabled;
    const isTimeAutomation = data.settings.automation.mode === AutomationMode.TIME;
    const isLocationAutomation = data.settings.automation.mode === AutomationMode.LOCATION;
    const now = new Date();

    const automationMessage = getAutomationMessage({data});

    const isProtected = !isFile && ((!__CHROMIUM_MV3__ && !tab.isInjected) || tab.isProtected);
    const isProtectedFile = isFile && !data.isAllowedFileSchemeAccess;
    const isSiteEnabled = !(isProtected || isProtectedFile || tab.isInDarkList);

    const siteToggleMessage = getSiteToggleMessage(props);

    return (
        <header class="header">
            <a class="header__logo" href={HOMEPAGE_URL} target="_blank" rel="noopener noreferrer">
                Dark Reader
            </a>
            <div class="header__control header__site-toggle">
                <SiteToggle
                    data={data}
                    actions={actions}
                />
                <span
                    class={{
                        'header__more-settings-button': true,
                        'header__more-settings-button--off': !isSiteEnabled,
                    }}
                    onclick={onMoreSiteSettingsClick}
                >
                    <SettingsIcon class="header__more-settings-button__icon" />
                    {siteToggleMessage}
                </span>
            </div>
            <div class="header__control header__app-toggle">
                <Toggle checked={data.isEnabled} labelOn={getLocalMessage('on')} labelOff={getLocalMessage('off')} onChange={toggleApp} />
                <span
                    class={{
                        'header__more-settings-button': true,
                        'header__more-settings-button--off': !data.isEnabled,
                    }}
                    onclick={onMoreToggleSettingsClick}
                >
                    <SettingsIcon class="header__more-settings-button__icon" />
                    {automationMessage}
                </span>
                <span
                    class={{
                        'header__app-toggle__time': true,
                        'header__app-toggle__time--active': isAutomation,
                    }}
                >
                    {(isTimeAutomation
                        ? <WatchIcon hours={now.getHours()} minutes={now.getMinutes()} />
                        : (isLocationAutomation
                            ? (<SunMoonIcon date={now} latitude={data.settings.location.latitude!} longitude={data.settings.location.longitude!} />)
                            : <SystemIcon />))}
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
