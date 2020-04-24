import {m} from 'malevic';
import {isURLEnabled} from '../../../utils/url';
import SiteToggle from '../components/site-toggle';
import ControlGroup from '../control-group';
import {ViewProps} from '../types';

export default function SiteToggleGroup(props: ViewProps) {
    const isSiteEnabled = isURLEnabled(props.tab.url, props.data.settings, props.tab);
    return (
        <ControlGroup class="site-toggle-group">
            <ControlGroup.Control class="site-toggle-group__control">
                <SiteToggle {...props} />
            </ControlGroup.Control>
            <ControlGroup.Description>
                {isSiteEnabled ?
                    'Enabled for current website' :
                    'Disabled for current website'}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
