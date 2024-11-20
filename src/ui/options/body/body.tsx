import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import type {ViewProps} from '../../../definitions';
import {Overlay} from '../../controls';
import {AdvancedIcon, HelpIcon, KeyboardIcon, ListIcon, SettingsIcon, WatchIcon} from '../../icons';
import {AboutTab} from '../about/about-tab';
import {AdvancedTab} from '../advanced/advanced-tab';
import {AutomationTab} from '../automation/automation-tab';
import {GeneralTab} from '../general/general-tab';
import {HotkeysTab} from '../hotkeys/hotkeys-tab';
import {SiteListTab} from '../site-list/site-list-tab';
import TabPanel from '../tab-panel/tab-panel';
import {getLocalMessage} from '../../../utils/locales';

type BodyProps = ViewProps;

export default function Body(props: BodyProps): Malevic.Child {
    const context = getContext();
    const store = context.getStore({activeTabId: 'general'});

    function onSettingsTabChange(tabId: string) {
        store.activeTabId = tabId;
        context.refresh();
    }

    const now = new Date();
    const autoIcon = <WatchIcon hours={now.getHours()} minutes={now.getMinutes()} color="currentColor" />;

    return (
        <body>
            <header>
                <img id="logo" src="../assets/images/darkreader-type.svg" alt="Dark Reader" />
                <h1 id="title">{getLocalMessage('settings')}</h1>
            </header>
            <TabPanel activeTabId={store.activeTabId} onTabChange={onSettingsTabChange}>
                <TabPanel.Tab id="general" label={getLocalMessage('general')} icon={<SettingsIcon />} iconClass="settings-icon-general">
                    <GeneralTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="site-list" label={getLocalMessage('site_list')} icon={<ListIcon />} iconClass="settings-icon-list">
                    <SiteListTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="automation" label={getLocalMessage('automation')} icon={autoIcon} iconClass="settings-icon-auto">
                    <AutomationTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="hotkeys" label={getLocalMessage('hotkeys')} icon={<KeyboardIcon />} iconClass="settings-icon-hotkeys">
                    <HotkeysTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="advanced" label={getLocalMessage('advanced')} icon={<AdvancedIcon />} iconClass="settings-icon-advanced">
                    <AdvancedTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="about" label={getLocalMessage('about')} icon={<HelpIcon />} iconClass="settings-icon-about">
                    <AboutTab {...props} />
                </TabPanel.Tab>
            </TabPanel>
            <Overlay />
        </body>
    );
}
