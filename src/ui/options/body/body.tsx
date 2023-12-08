import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import TabPanel from '../tab-panel/tab-panel';

export default function Body(): Malevic.Child {
    const context = getContext();
    const store = context.getStore({activeTabId: 'general'});

    function onSettingsTabChange(tabId: string) {
        store.activeTabId = tabId;
        context.refresh();
    }

    return (
        <body>
            <header>
                <img id="logo" src="../assets/images/darkreader-type.svg" alt="Dark Reader" />
                <h1 id="title">Settings</h1>
            </header>
            <TabPanel activeTabId={store.activeTabId} onTabChange={onSettingsTabChange}>
                <TabPanel.Tab id="general" label="General">
                    <p>General</p>
                </TabPanel.Tab>
                <TabPanel.Tab id="site-list" label="Site List">
                    <p>Site List</p>
                </TabPanel.Tab>
                <TabPanel.Tab id="automation" label="Automation">
                    <p>Automation</p>
                </TabPanel.Tab>
            </TabPanel>
        </body>
    );
}
