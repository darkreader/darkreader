import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ViewProps} from '../../../definitions';
import {Overlay} from '../../controls';
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
    return (
        <body>
            <header>
                <h1 id="title">Lean Dark+</h1>
                <h1 id="title">Settings</h1>
            </header>
            <TabPanel
                activeTabId={store.activeTabId}
                onTabChange={onSettingsTabChange}
            >
                <TabPanel.Tab
                    id="general"
                    label="General"
                    iconClass="settings-icon-general"
                >
                    <GeneralTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab
                    id="site-list"
                    label="Site List"
                    iconClass="settings-icon-list"
                >
                    <SiteListTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab
                    id="automation"
                    label="Automation"
                    iconClass="settings-icon-auto"
                >
                    <AutomationTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab
                    id="hotkeys"
                    label="Hotkeys"
                    iconClass="settings-icon-hotkeys"
                >
                    <HotkeysTab {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab
                    id="advanced"
                    label="Advanced"
                    iconClass="settings-icon-advanced"
                >
                    <AdvancedTab {...props} />
                </TabPanel.Tab>
            </TabPanel>
            <Overlay />
        </body>
    );
}
