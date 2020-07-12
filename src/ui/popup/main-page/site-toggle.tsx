import {m} from 'malevic';
import {isURLEnabled, isPDF} from '../../../utils/url';
import SiteToggle from '../components/site-toggle';
import ControlGroup from '../control-group';
import {ViewProps} from '../types';
import {getLocalMessage} from '../../../utils/locales';

export default function SiteToggleGroup(props: ViewProps) {
    const isPageEnabled = isURLEnabled(props.tab.url, props.data.settings, props.tab);
    const description = isPDF(props.tab.url) ?
        isPageEnabled ?
            getLocalMessage('pdf_enabled') :
            getLocalMessage('pdf_disabled') :
        isPageEnabled ?
            getLocalMessage('site_enabled') :
            getLocalMessage('site_disabled');
    return (
        <ControlGroup class="site-toggle-group">
            <ControlGroup.Control class="site-toggle-group__control">
                <SiteToggle {...props} />
            </ControlGroup.Control>
            <ControlGroup.Description>
                {description}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
