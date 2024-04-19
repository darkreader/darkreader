import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import TabPanel from '../../options/tab-panel/tab-panel';
import {ConfigEditor} from './config-editor';
import type {ExtWrapper, DevToolsData} from '../../../definitions';

type DynamicModeEditorProps = ExtWrapper & {devtools: DevToolsData};

export function DynamicModeEditor(props: DynamicModeEditorProps): Malevic.Child {
    const context = getContext();
    const store = context.getStore({activeTabId: 'full-editor'});

    function onTabChange(tabId: string) {
        store.activeTabId = tabId;
        context.refresh();
    }

    return (
        <TabPanel isVertical activeTabId={store.activeTabId} onTabChange={onTabChange}>
            <TabPanel.Tab id="full-editor" label="Full Editor">
                <ConfigEditor
                    text={props.devtools.dynamicFixesText}
                    apply={props.actions.applyDevDynamicThemeFixes}
                    reset={props.actions.resetDevDynamicThemeFixes}
                />
            </TabPanel.Tab>
            <TabPanel.Tab id="per-site-editor" label="Per Site Editor">
                In progress
            </TabPanel.Tab>
        </TabPanel>
    );
}
