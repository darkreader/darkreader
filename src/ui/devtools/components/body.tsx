import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {DetectorHint, DynamicThemeFix, InversionFix, StaticTheme} from '../../../definitions';
import {formatInversionFixes, parseInversionFixes} from '../../../generators/css-filter';
import {formatDetectorHints, parseDetectorHints} from '../../../generators/detector-hints';
import {formatDynamicThemeFixes, parseDynamicThemeFixes} from '../../../generators/dynamic-theme';
import {formatStaticThemes, parseStaticThemes} from '../../../generators/static-theme';
import {ThemeEngine} from '../../../generators/theme-engines';
import {isMobile} from '../../../utils/platform';
import {Button, Overlay} from '../../controls';
import TabPanel from '../../options/tab-panel/tab-panel';
import {getCurrentThemePreset} from '../../popup/theme/utils';
import type {DevtoolsProps} from '../types';

import {ConfigEditorTabs} from './config-editor-tabs';

declare const __PLUS__: boolean;

export default function Body(props: DevtoolsProps): Malevic.Child {
    const {data, actions} = props;
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
                    <ConfigEditorTabs
                        {...props}
                        type="dynamic"
                        format={formatDynamicThemeFixes}
                        parse={parseDynamicThemeFixes}
                        create={(url) => {
                            return {
                                url: [url],
                                invert: [
                                    '.example_icon-selector-to-invert',
                                    'img[src*="image-to-invert.png"]',
                                ],
                                css: [
                                    '.example_color-value-inversion {',
                                    '    background-color: ${rgba(128 255 164)} !important;',
                                    '    color: ${black} !important;',
                                    '}',
                                    '.example_remove-background-image {',
                                    '    background-image: none !important;',
                                    '}',
                                    '.example_builin-variables {',
                                    '    background-color: var(--darkreader-neutral-background) !important;',
                                    '    color: var(--darkreader-neutral-text) !important;',
                                    '}',
                                ].join('\n'),
                                ignoreImageAnalysis: [],
                                ignoreInlineStyle: [],
                                ignoreCSSUrl: [],
                                disableStyleSheetsProxy: false,
                                disableCustomElementRegistryProxy: false,
                            } as DynamicThemeFix;
                        }}
                    />
                </TabPanel.Tab>
                <TabPanel.Tab id="filter-editor" label="Inversion Fix Editor">
                    <ConfigEditorTabs
                        {...props}
                        type="filter"
                        format={formatInversionFixes}
                        parse={parseInversionFixes}
                        create={(url) => {
                            return {
                                url: [url],
                                invert: [
                                    '.example_icon-selector-to-invert',
                                    'img[src*="image-to-invert.png"]',
                                ],
                                noinvert: [
                                    '.example_icon-to-not-invert',
                                ],
                                removebg: [
                                    '.example_remove-background',
                                ],
                                css: [
                                    '.example_force-color-before-inversion {',
                                    '    background-color: ${rgba(128 255 164)} !important;',
                                    '    color: ${black} !important;',
                                    '}',
                                ].join('\n'),
                            } as InversionFix;
                        }}
                    />
                </TabPanel.Tab>
                <TabPanel.Tab id="static-editor" label="Static Theme Editor">
                    <ConfigEditorTabs
                        {...props}
                        type="static"
                        format={formatStaticThemes}
                        parse={parseStaticThemes}
                        create={(url) => {
                            return {
                                url: [url],
                            } as StaticTheme;
                        }}
                    />
                </TabPanel.Tab>
                <TabPanel.Tab id="detector-editor" label="Detector Hints Editor">
                    <ConfigEditorTabs
                        {...props}
                        type="detector"
                        format={formatDetectorHints}
                        parse={parseDetectorHints}
                        create={(url) => {
                            return {
                                url: [url],
                                target: 'html',
                                match: [
                                    '.example-dark-theme-selector',
                                ],
                                noDarkTheme: false,
                                systemTheme: false,
                                iframe: false,
                            } as DetectorHint;
                        }}
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
