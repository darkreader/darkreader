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

declare const __PLUS__: boolean;

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
    const previewNewestButtonText = data.settings.previewNewestDesign ? 'Switch to old design' : 'Preview new design';

    function toggleDesign(): void {
        actions.changeSettings({previewNewDesign: !data.settings.previewNewDesign, previewNewestDesign: false});
    }

    function toggleNewestDesign(): void {
        actions.changeSettings({previewNewestDesign: !data.settings.previewNewestDesign, previewNewDesign: false});
    }

    return (
        <body>
            <header>
                <img id="logo" src="../assets/images/darkreader-type.svg" alt="Dark Reader" />
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
                        {isMobile || (__PLUS__ && !data.settings.previewNewDesign) ? null : <Button class="preview-design-button" onclick={toggleDesign}>{previewButtonText}</Button>}
                        {__PLUS__ ? <Button class="preview-design-button" onclick={toggleNewestDesign}>{previewNewestButtonText}</Button> : null}
                    </div>
                </TabPanel.Tab>
            </TabPanel>
            <Overlay />
        </body>
    );
}
