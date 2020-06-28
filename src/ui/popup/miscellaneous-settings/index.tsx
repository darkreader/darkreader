import {m} from 'malevic';
import {isFirefox} from '../../../utils/platform';
import {ViewProps} from '../types';
import EnabledByDefaultGroup from './enabled-by-default';
import InvertPDF from './invert-pdf';
import SyncSettings from './Sync-settings';

type SettingsPageProps = ViewProps & {
    onAutomationNavClick: () => void;
    onManageSettingsClick: () => void;
};

export default function SettingsPage(props: SettingsPageProps) {
    return (
        <section class="m-section">
            <EnabledByDefaultGroup {...props} />
            {isFirefox() ? null : <InvertPDF {...props} />}
            <SyncSettings {...props} />
        </section>
    );
}
