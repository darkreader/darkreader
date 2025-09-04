import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import {ThemeEngine} from '../../../generators/theme-engines';
import {isMobile} from '../../../utils/platform';
import {Button, Overlay} from '../../controls';
import TabPanel from '../../options/tab-panel/tab-panel';
import {getCurrentThemePreset} from '../../popup/theme/utils';
import type {DevtoolsProps} from '../types';

import {ConfigEditor} from './config-editor';
import {DynamicModeEditor} from './dynamic-mode-editor';

export default function Body(props: DevtoolsProps): Malevic.Child {
    const {data, actions, devtools} = props;
    const context = getContext();
    const {theme} = getCurrentThemePreset({data, actions});
    const defaultTabId: string = {
        [ThemeEngine.dynamicTheme]: 'dynamic-editor',
        [ThemeEngine.staticTheme]: 'static-editor',
        [ThemeEngine.cssFilter]: 'filter-editor',
        [ThemeEngine.svgFilter]: 'filter-editor',
    }[theme.engine];
    const store = context.getStore({errorText: '', activeTabId: defaultTabId});

    function onTabChange(tabId: string) {
        store.activeTabId = tabId;
        context.refresh();
    }

    const previewButtonText = data.settings.previewNewDesign ? 'Switch to old design' : 'Enable design prototype';

    function toggleDesign(): void {
        actions.changeSettings({previewNewDesign: !data.settings.previewNewDesign, previewNewestDesign: false});
    }

    return (
        <body>
            <header>
                <h1 id="title">Lean Dark+</h1>
                <h1 id="title">Developer Tools</h1>
            </header>
            <TabPanel activeTabId={store.activeTabId} onTabChange={onTabChange}>
                <TabPanel.Tab id="dynamic-editor" label="Dynamic Theme Editor">
                    <DynamicModeEditor {...props} />
                </TabPanel.Tab>
                <TabPanel.Tab id="static-editor" label="Static Theme Editor">
                    <ConfigEditor
                        header="Static Theme Editor"
                        text={devtools.staticThemesText}
                        apply={(text) => actions.applyDevStaticThemes(text)}
                        reset={() => actions.resetDevStaticThemes()}
                    />
                </TabPanel.Tab>
                <TabPanel.Tab id="filter-editor" label="Inversion Fix Editor">
                    <ConfigEditor
                        header="Inversion Fix Editor"
                        text={devtools.filterFixesText}
                        apply={(text) => actions.applyDevInversionFixes(text)}
                        reset={() => actions.resetDevInversionFixes()}
                    />
                </TabPanel.Tab>
                <TabPanel.Tab id="advanced" label="Advanced">
                    <div class="buttons">
                        {isMobile ? null : <Button class="preview-design-button" onclick={toggleDesign}>{previewButtonText}</Button>}
                    </div>
                </TabPanel.Tab>
            </TabPanel>
            <Overlay />
        </body>
    );
}
