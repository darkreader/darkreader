import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import type {DevToolsData, ViewProps} from '../../../definitions';
import {Overlay} from '../../controls';
import {ListIcon, WatchIcon} from '../../icons';
import {AdvancedTab} from '../advanced/advanced-tab';
import {AutomationTab} from '../automation/automation-tab';
import {GeneralTab} from '../general/general-tab';
import {SiteListTab} from '../site-list/site-list-tab';
import TabPanel from '../tab-panel/tab-panel';

type BodyProps = ViewProps & {
    devtools: DevToolsData;
};

export default function Body(props: BodyProps): Malevic.Child {
    const context = getContext();
    const store = context.getStore({activeTabId: 'general'});

    function onSettingsTabChange(tabId: string) {
        store.activeTabId = tabId;
        context.refresh();
    }

    const now = new Date();
    const autoIcon = <span class="settings-icon-auto">
        <WatchIcon hours={now.getHours()} minutes={now.getMinutes()} color="currentColor" />
    </span>;
    const listIcon = <span class="settings-icon-list">
        <ListIcon />
    </span>;

    return (
        <body>
            <header>
                <img id="logo" src="../assets/images/darkreader-type.svg" alt="Dark Reader" />
                <h1 id="title">Settings</h1>
            </header>
            <TabPanel activeTabId={store.activeTabId} onTabChange={onSettingsTabChange}>
                <TabPanel.Tab id="general" label="General">
                    <GeneralTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="site-list" label="Site List" icon={listIcon}>
                    <SiteListTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="automation" label="Automation" icon={autoIcon}>
                    <AutomationTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="advanced" label="Advanced">
                    <AdvancedTab {...props} />
                </TabPanel.Tab>
            </TabPanel>
            <Overlay />
        </body>
    );
}
