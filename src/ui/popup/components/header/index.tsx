import {m} from 'malevic';

import type {ExtensionData, ExtWrapper} from '../../../../definitions';
import {AutomationMode} from '../../../../utils/automation';
import {getLocalMessage} from '../../../../utils/locales';
import {isChromium} from '../../../../utils/platform';
import {isLocalFile} from '../../../../utils/url';
import {Toggle} from '../../../controls';
import SiteToggle from '../site-toggle';


declare const __CHROMIUM_MV3__: boolean;

type HeaderProps = ExtWrapper & {
  onMoreSiteSettingsClick: () => void;
  onMoreToggleSettingsClick: () => void;
};

export function getAutomationMessage(props: { data: ExtensionData }) {
    const {data} = props;
    const isAutomation = data.settings.automation.enabled;
    const isTimeAutomation =
    data.settings.automation.mode === AutomationMode.TIME;
    const isLocationAutomation =
    data.settings.automation.mode === AutomationMode.LOCATION;
    return isAutomation
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

    const isProtected =
    !isFile && ((!__CHROMIUM_MV3__ && !tab.isInjected) || tab.isProtected);

    return isProtected
        ? getLocalMessage('page_protected')
        : isFile && !data.isAllowedFileSchemeAccess
            ? getLocalMessage('local_files_forbidden')
            : tab.isInDarkList
                ? getLocalMessage('page_in_dark_list')
                : tab.isDarkThemeDetected
                    ? getLocalMessage('dark_theme_detected')
                    : getLocalMessage('configure_site_toggle');
}

function Header(props: HeaderProps) {
    const {data, actions} =
    props;

    function toggleApp(enabled: boolean) {
        toggleExtension(props, enabled);
    }

    data.settings.automation.mode === AutomationMode.TIME;
    data.settings.automation.mode === AutomationMode.LOCATION;

    return (
        <header class="header">
            <p >Lean Dark+</p>
            <div class="header__control header__site-toggle">
                <SiteToggle data={data} actions={actions} />
            </div>
            <div class="header__control header__app-toggle">
                <Toggle
                    checked={data.isEnabled}
                    labelOn={'🟢'}
                    labelOff={'🔴'}
                    onChange={toggleApp}
                    class="appToggle"
                />
            </div>
        </header>
    );
}

export {
    Header,
};
