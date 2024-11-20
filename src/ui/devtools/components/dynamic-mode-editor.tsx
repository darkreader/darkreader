import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import TabPanel from '../../options/tab-panel/tab-panel';
import {ConfigEditor} from './config-editor';
import type {DevtoolsProps} from '../types';
import {DynamicPerSiteEditor} from './dynamic-per-site';
import {getLocalMessage} from '../../../utils/locales';

export function DynamicModeEditor(props: DevtoolsProps): Malevic.Child {
    const context = getContext();
    const store = context.getStore({activeTabId: 'full-editor'});

    function onTabChange(tabId: string) {
        store.activeTabId = tabId;
        context.refresh();
    }

    return (
        <div class="dynamic-mode-editor">
            <TabPanel isVertical activeTabId={store.activeTabId} onTabChange={onTabChange}>
                <TabPanel.Tab id="full-editor" label={getLocalMessage('full_ditor')}>
                    <ConfigEditor
                        text={props.devtools.dynamicFixesText}
                        apply={(text) => props.actions.applyDevDynamicThemeFixes(text)}
                        reset={() => props.actions.resetDevDynamicThemeFixes()}
                    />
                </TabPanel.Tab>
                <TabPanel.Tab id="per-site-editor" label={getLocalMessage('per_site_ditor')}>
                    <DynamicPerSiteEditor {...props} />
                </TabPanel.Tab>
            </TabPanel>
        </div>
    );
}
