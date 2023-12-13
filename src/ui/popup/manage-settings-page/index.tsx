import {m} from 'malevic';
import type {ViewProps} from '../../../definitions';
import {ResetSettings} from '../../options/advanced/reset-settings';
import {ImportSettings} from '../../options/advanced/import-settings';
import {ExportSettings} from '../../options/advanced/export-settings';
import {SyncSettings} from '../../options/advanced/sync-settings';
import {ExportTheme} from '../../options/advanced/export-theme';
import {isURLEnabled, isURLInList} from '../../../utils/url';
import {ThemeEngine} from '../../../generators/theme-engines';
import {SyncConfig} from '../../options/advanced/sync-config';
import {FetchNews} from '../../options/advanced/fetch-news';

export default function ManageSettingsPage(props: ViewProps) {
    const custom = props.data.settings.customThemes.find(
        ({url}) => isURLInList(props.data.activeTab.url, url)
    );
    const engine = custom ?
        custom.theme.engine :
        props.data.settings.theme.engine;

    const tab = props.data.activeTab;
    const {isDarkThemeDetected, isInDarkList, isInjected, isProtected, id} = props.data.activeTab;
    const canExportTheme = (engine === ThemeEngine.dynamicTheme) && id
        && !isDarkThemeDetected && !isInDarkList && !isProtected && (isInjected !== false)
        && isURLEnabled(tab.url, props.data.settings, tab, props.data.isAllowedFileSchemeAccess);

    return (
        <section class="m-section">
            <SyncSettings {...props} />
            <SyncConfig {...props} />
            <FetchNews {...props} />
            <ImportSettings {...props} />
            <ExportSettings {...props} />
            {canExportTheme ? <ExportTheme {...props} /> : null}
            <ResetSettings {...props} />
        </section>
    );
}
