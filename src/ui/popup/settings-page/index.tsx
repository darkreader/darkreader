import {m} from 'malevic';
import type {ViewProps} from '../../../definitions';
import AutomationButton from './automation-button';
import {DevTools} from '../../options/advanced/devtools';
import ManageSettingsButton from './mange-settings-button';
import SiteListButton from './site-list-button';
import {EnabledByDefault as EnabledByDefaultGroup} from '../../options/general/enabled-by-default';
import {DetectDarkTheme as DetectDarkThemeGroup} from '../../options/general/detect-dark-theme';
import {ChangeBrowserTheme} from '../../options/general/change-browser-theme';
import {ContextMenus as ContextMenusGroup} from '../../options/general/context-menus';
import {AppVersion as Version} from '../../options/version/version';
import {isFirefox} from '../../../utils/platform';

type SettingsPageProps = ViewProps & {
    onAutomationNavClick: () => void;
    onManageSettingsClick: () => void;
    onSiteListNavClick: () => void;
};

export default function SettingsPage(props: SettingsPageProps) {
    return (
        <section class="m-section">
            <EnabledByDefaultGroup {...props} />
            {isFirefox ? <ChangeBrowserTheme {...props} /> : null}
            <SiteListButton onClick={props.onSiteListNavClick} />
            <DevTools />
            <AutomationButton onClick={props.onAutomationNavClick} />
            <ContextMenusGroup {...props} />
            <ManageSettingsButton onClick={props.onManageSettingsClick} />
            <DetectDarkThemeGroup {...props} />
            <Version />
        </section>
    );
}
