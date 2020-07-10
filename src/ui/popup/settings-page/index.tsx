import {m} from 'malevic';
import {ViewProps} from '../types';
import AutomationButton from './automation-button';
import DevToolsGroup from './devtools';
import ManageSettingsButton from './mange-settings-button';
import {isFirefox} from '../../../utils/platform';
import EnabledByDefaultGroup from './enabled-by-default';
import InvertPDF from './invert-pdf';
import FontSettingsButton from './font-settings-button';

type SettingsPageProps = ViewProps & {
    onAutomationNavClick: () => void;
    onManageSettingsClick: () => void;
    onFontSettingsClick: () => void;
};

export default function SettingsPage(props: SettingsPageProps) {
    return (
        <section class="m-section">
            <EnabledByDefaultGroup {...props} />
            {isFirefox() ? null : <InvertPDF {...props} />}
            <DevToolsGroup {...props} />
            <AutomationButton onClick={props.onAutomationNavClick} />
            <FontSettingsButton onClick={props.onFontSettingsClick} />
            <ManageSettingsButton onClick={props.onManageSettingsClick} />

        </section>
    );
}
