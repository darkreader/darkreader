import {m} from 'malevic';
import {ViewProps} from '../types';
import DevToolsGroup from './devtools';
import EnabledByDefaultGroup from './enabled-by-default';
import HelpGroup from './help';

export default function SettingsPage(props: ViewProps & {onBackClick: () => void}) {
    return (
        <section class="m-section">
            <EnabledByDefaultGroup {...props} />
            <DevToolsGroup {...props} />
            <HelpGroup />
        </section>
    );
}
