import {m} from 'malevic';
import {ViewProps} from '../types';
import DevToolsGroup from './devtools';
import EnabledByDefaultGroup from './enabled-by-default';
import HelpGroup from './help';
import InvertPDF from './invert-pdf';
import ScrollbarTheming from './scrollbar';

export default function SettingsPage(props: ViewProps) {
    return (
        <section class="m-section">
            <EnabledByDefaultGroup {...props} />
            <InvertPDF {...props} />
            <ScrollbarTheming {...props} />
            <DevToolsGroup {...props} />
            <HelpGroup />
        </section>
    );
}
