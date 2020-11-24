import {m} from 'malevic';
import type {ViewProps} from '../types';
import ResetButtonGroup from './reset-settings-button';
import ImportButton from './import-settings';
import ExportButton from './export-settings';
import SyncSettings from './sync-settings';
import ExportTheme from './export-theme';
import {isURLInList} from '../../../utils/url';
import themeEngines from '../../../generators/theme-engines';
import SyncConfigButton from './sync-config';

export default function ManageSettingsPage(props: ViewProps) {
    const custom = props.data.settings.customThemes.find(
        ({url}) => isURLInList(props.tab.url, url)
    );
    const engine = custom ?
        custom.theme.engine :
        props.data.settings.theme.engine;

    return (
        <section class="m-section">
            <SyncSettings {...props} />
            <SyncConfigButton {...props} />
            <ImportButton {...props} />
            <ExportButton {...props} />
            {engine === themeEngines.dynamicTheme ? <ExportTheme /> : null}
            <ResetButtonGroup {...props} />
        </section>
    );
}
