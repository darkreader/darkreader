import { m } from 'malevic';
import type { ViewProps } from '../types';
import AutomationButton from './automation-button';
import DevToolsGroup from './devtools';
import ManageSettingsButton from './mange-settings-button';
import SiteListButton from './site-list-button';
import EnabledByDefaultGroup from './enabled-by-default';
import DetectDarkThemeGroup from './detect-dark-theme';
import ChangeBrowserTheme from './change-browser-theme';
import ContextMenusGroup from './context-menus';
import Version from './version';
import { isFirefox } from '../../../utils/platform';

type SettingsPageProps = ViewProps & {
    onAutomationNavClick: () => void;
    onManageSettingsClick: () => void;
    onSiteListNavClick: () => void;
};

export default function SettingsPage(props: SettingsPageProps) {
    return (
        <section class='m-section'>
            <EnabledByDefaultGroup {...props} />
            {isFirefox ? <ChangeBrowserTheme {...props} /> : null}
            <SiteListButton onClick={props.onSiteListNavClick} />
            <DevToolsGroup />
            <AutomationButton onClick={props.onAutomationNavClick} />
            <ContextMenusGroup {...props} />
            <ManageSettingsButton onClick={props.onManageSettingsClick} />
            <DetectDarkThemeGroup {...props} />
            <Version />
        </section>
    );
}
