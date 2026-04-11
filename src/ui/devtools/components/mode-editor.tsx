import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import TabPanel from '../../options/tab-panel/tab-panel';

import {ConfigEditor} from './config-editor';
import {PerSiteEditor} from './per-site-editor';

interface ModeEditorProps<T extends {url: string[]}> {
    fixesText: string;
    parse: (text: string) => T[];
    format: (fixes: T[]) => string;
    apply: (text: string) => Promise<void>;
    reset: () => void;
    createFix: (url: string) => T;
}

export function ModeEditor<T extends {url: string[]}>(props: ModeEditorProps<T>): Malevic.Child {
    const context = getContext();
    const store = context.getStore({activeTabId: 'full-editor'});

    function onTabChange(tabId: string) {
        store.activeTabId = tabId;
        context.refresh();
    }

    return (
        <div class="mode-editor">
            <TabPanel isVertical activeTabId={store.activeTabId} onTabChange={onTabChange}>
                <TabPanel.Tab id="full-editor" label="Full Editor">
                    <ConfigEditor
                        text={props.fixesText}
                        apply={props.apply}
                        reset={props.reset}
                    />
                </TabPanel.Tab>
                <TabPanel.Tab id="per-site-editor" label="Per Site Editor">
                    <PerSiteEditor
                        fixesText={props.fixesText}
                        parse={props.parse}
                        format={props.format}
                        apply={props.apply}
                        reset={props.reset}
                        createFix={props.createFix}
                    />
                </TabPanel.Tab>
            </TabPanel>
        </div>
    );
}
