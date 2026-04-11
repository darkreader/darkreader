import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {DetectorHint, DynamicThemeFix, InversionFix, StaticTheme} from '../../../definitions';
import {parseDetectorHints, formatDetectorHints} from '../../../generators/detector-hints';
import {parseDynamicThemeFixes, formatDynamicThemeFixes} from '../../../generators/dynamic-theme';
import {parseInversionFixes, formatInversionFixes} from '../../../generators/css-filter';
import {parseStaticThemes, formatStaticThemes} from '../../../generators/static-theme';
import {ThemeEngine} from '../../../generators/theme-engines';
import {isMobile} from '../../../utils/platform';
import {Button, Overlay} from '../../controls';
import TabPanel from '../../options/tab-panel/tab-panel';
import {getCurrentThemePreset} from '../../popup/theme/utils';
import type {DevtoolsProps} from '../types';

import {ModeEditor} from './mode-editor';

declare const __PLUS__: boolean;

function createDynamicFix(url: string): DynamicThemeFix {
    return {
        url: [url],
        invert: [],
        css: '',
        ignoreImageAnalysis: [],
        ignoreInlineStyle: [],
        ignoreCSSUrl: [],
        disableStyleSheetsProxy: false,
        disableCustomElementRegistryProxy: false,
    };
}

function createInversionFix(url: string): InversionFix {
    return {url: [url], invert: [], noinvert: [], removebg: [], css: ''};
}

function createStaticTheme(url: string): StaticTheme {
    return {url: [url]};
}

function createDetectorHint(url: string): DetectorHint {
    return {url: [url], target: '', match: [], noDarkTheme: false, systemTheme: false, iframe: false};
}

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
                    <ModeEditor
                        fixesText={devtools.dynamicFixesText}
                        parse={parseDynamicThemeFixes}
                        format={formatDynamicThemeFixes}
                        apply={(text) => actions.applyDevDynamicThemeFixes(text)}
                        reset={() => actions.resetDevDynamicThemeFixes()}
                        createFix={createDynamicFix}
                    />
                </TabPanel.Tab>
                <TabPanel.Tab id="static-editor" label="Static Theme Editor">
                    <ModeEditor
                        fixesText={devtools.staticThemesText}
                        parse={parseStaticThemes}
                        format={formatStaticThemes}
                        apply={(text) => actions.applyDevStaticThemes(text)}
                        reset={() => actions.resetDevStaticThemes()}
                        createFix={createStaticTheme}
                    />
                </TabPanel.Tab>
                <TabPanel.Tab id="filter-editor" label="Inversion Fix Editor">
                    <ModeEditor
                        fixesText={devtools.filterFixesText}
                        parse={parseInversionFixes}
                        format={formatInversionFixes}
                        apply={(text) => actions.applyDevInversionFixes(text)}
                        reset={() => actions.resetDevInversionFixes()}
                        createFix={createInversionFix}
                    />
                </TabPanel.Tab>
                <TabPanel.Tab id="detector-editor" label="Detector Hints Editor">
                    <ModeEditor
                        fixesText={devtools.detectorHintsText}
                        parse={parseDetectorHints}
                        format={formatDetectorHints}
                        apply={(text) => actions.applyDevDetectorHints(text)}
                        reset={() => actions.resetDevDetectorHints()}
                        createFix={createDetectorHint}
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
