import {m} from 'malevic';
import {ViewProps} from '../types';
import ResetButtonGroup from './reset-settings-button';
import ImportButton from './import-settings';
import ExportButton from './export-settings';
import SyncSettings from './sync-settings';

export default function ManageSettingsPage(props: ViewProps) {

    return (
        <section class="m-section">
            <SyncSettings {...props} />
            <ImportButton {...props} />
            <ExportButton {...props} />
            <ResetButtonGroup {...props} />
        </section>
    );
}
