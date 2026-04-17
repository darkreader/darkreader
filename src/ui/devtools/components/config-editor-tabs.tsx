import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import TabPanel from '../../options/tab-panel/tab-panel';
import type {ConfigEditorProps} from '../types';

import {ConfigEditor} from './config-editor';
import {PerSiteConfigEditor} from './config-editor-per-site';

export function ConfigEditorTabs(props: ConfigEditorProps): Malevic.Child {
    const context = getContext();
    const store = context.getStore({activeTabId: 'full-editor'});

    function onTabChange(tabId: string) {
        store.activeTabId = tabId;
        context.refresh();
    }

    return (
        <div class="config-editor-tabs">
            <TabPanel isVertical activeTabId={store.activeTabId} onTabChange={onTabChange}>
                <TabPanel.Tab id="full-editor" label="Full Editor">
                    <ConfigEditor
                        text={props.devtools[props.type]}
                        apply={(text) => props.actions.applyDevFixes(props.type, text)}
                        reset={() => props.actions.resetDevFixes(props.type)}
                    />
                </TabPanel.Tab>
                <TabPanel.Tab id="per-site-editor" label="Per Site Editor">
                    <PerSiteConfigEditor {...props} />
                </TabPanel.Tab>
            </TabPanel>
        </div>
    );
}
