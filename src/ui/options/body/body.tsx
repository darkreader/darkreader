import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ViewProps} from '../../../definitions';
import {Overlay} from '../../controls';
import {AdvancedIcon, HelpIcon, KeyboardIcon, KeyIcon, ListIcon, SettingsIcon, WatchIcon} from '../../icons';
import {AboutTab} from '../about/about-tab';
import {ActivationTab} from '../activation/activation-tab';
import {AdvancedTab} from '../advanced/advanced-tab';
import {AutomationTab} from '../automation/automation-tab';
import {GeneralTab} from '../general/general-tab';
import {HotkeysTab} from '../hotkeys/hotkeys-tab';
import {SiteListTab} from '../site-list/site-list-tab';
import TabPanel from '../tab-panel/tab-panel';

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
                <h1 id="title">Settings</h1>
            </header>
            <TabPanel activeTabId={store.activeTabId} onTabChange={onSettingsTabChange}>
                <TabPanel.Tab id="general" label="General" icon={<SettingsIcon />} iconClass="settings-icon-general">
                    <GeneralTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="site-list" label="Site List" icon={<ListIcon />} iconClass="settings-icon-list">
                    <SiteListTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="automation" label="Automation" icon={autoIcon} iconClass="settings-icon-auto">
                    <AutomationTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="hotkeys" label="Hotkeys" icon={<KeyboardIcon />} iconClass="settings-icon-hotkeys">
                    <HotkeysTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="activation" label="Activation" icon={<KeyIcon />} iconClass="settings-icon-activation">
                    <ActivationTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="advanced" label="Advanced" icon={<AdvancedIcon />} iconClass="settings-icon-advanced">
                    <AdvancedTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="about" label="About" icon={<HelpIcon />} iconClass="settings-icon-about">
                    <AboutTab {...props} />
                </TabPanel.Tab>
            </TabPanel>
            <Overlay />
        </body>
    );
}
