import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import type {DevToolsData, ViewProps} from '../../../definitions';
import {ListIcon, WatchIcon} from '../../icons';
import GeneralTab from '../general/general-tab';
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
                    <p>Site List</p>
                </TabPanel.Tab>
                <TabPanel.Tab id="automation" label="Automation" icon={autoIcon}>
                    <p>Automation</p>
                </TabPanel.Tab>
            </TabPanel>
        </body>
    );
}
