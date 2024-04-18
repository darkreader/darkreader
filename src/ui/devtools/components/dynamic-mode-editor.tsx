import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import TabPanel from '../../options/tab-panel/tab-panel';
import {ConfigEditor} from './config-editor';

interface DynamicModeEditorProps {
    text: string;
    apply: (text: string) => Promise<void>;
    reset: () => void;
}

export function DynamicModeEditor(props: DynamicModeEditorProps): Malevic.Child {
    const context = getContext();
    const store = context.getStore({activeTabId: 'full-editor'});

    function onTabChange(tabId: string) {
        store.activeTabId = tabId;
        context.refresh();
    }

    return (
        <TabPanel activeTabId={store.activeTabId} onTabChange={onTabChange}>
            <TabPanel.Tab id="full-editor" label="Full Editor">
                <ConfigEditor
                    header="Dynamic Theme Editor"
                    text={props.text}
                    apply={props.apply}
                    reset={props.reset}
                />
            </TabPanel.Tab>
            <TabPanel.Tab id="per-site-editor" label="Per Site Editor">
                Per Site Editor
            </TabPanel.Tab>
        </TabPanel>
    );
}
