import {m} from 'malevic';
import type {ViewProps} from '../../../definitions';
import {ThemeEngine} from '../../../generators/theme-engines';
import {isURLEnabled, isURLInList} from '../../../utils/url';
import {DevTools} from './devtools';
import {EnableForProtectedPages} from './enable-for-protected-pages';
import {ExportSettings} from './export-settings';
import {ExportTheme} from './export-theme';
import {FetchNews} from './fetch-news';
import {ImportSettings} from './import-settings';
import {ResetSettings} from './reset-settings';
import {SyncConfig} from './sync-config';
import {SyncSettings} from './sync-settings';

export function AdvancedTab(props: ViewProps): Malevic.Child {
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

    return <div class="settings-tab">
        <SyncSettings {...props} />
        <SyncConfig {...props} />
        <EnableForProtectedPages {...props} />
        <FetchNews {...props} />
        <ImportSettings {...props} />
        <ExportSettings {...props} />
        {canExportTheme ? <ExportTheme {...props} /> : null}
        <ResetSettings {...props} />
        <DevTools />
    </div>;
}
