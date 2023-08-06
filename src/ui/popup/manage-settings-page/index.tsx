import { m } from 'malevic';
import type { ViewProps } from '../types';
import ResetButtonGroup from './reset-settings-button';
import ImportButton from './import-settings';
import ExportButton from './export-settings';
import SyncSettings from './sync-settings';
import ExportTheme from './export-theme';
import { isURLEnabled, isURLInList } from '../../../utils/url';
import { ThemeEngine } from '../../../generators/theme-engines';
import SyncConfigButton from './sync-config';
import FetchNews from './fetch-news';

export default function ManageSettingsPage(props: ViewProps) {
    const custom = props.data.settings.customThemes.find(({ url }) =>
        isURLInList(props.data.activeTab.url, url),
    );
    const engine = custom
        ? custom.theme.engine
        : props.data.settings.theme.engine;

    const tab = props.data.activeTab;
    const { isDarkThemeDetected, isInDarkList, isInjected, isProtected, id } =
        props.data.activeTab;
    const canExportTheme =
        engine === ThemeEngine.dynamicTheme &&
        id &&
        !isDarkThemeDetected &&
        !isInDarkList &&
        !isProtected &&
        isInjected !== false &&
        isURLEnabled(
            tab.url,
            props.data.settings,
            tab,
            props.data.isAllowedFileSchemeAccess,
        );

    return (
        <section class='m-section'>
            <SyncSettings {...props} />
            <SyncConfigButton {...props} />
            <FetchNews {...props} />
            <ImportButton {...props} />
            <ExportButton {...props} />
            {canExportTheme ? <ExportTheme {...props} /> : null}
            <ResetButtonGroup {...props} />
        </section>
    );
}
