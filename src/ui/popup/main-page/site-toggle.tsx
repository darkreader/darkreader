import {m} from 'malevic';
import {isURLEnabled, isPDF} from '../../../utils/url';
import SiteToggle from '../components/site-toggle';
import ControlGroup from '../control-group';
import {ViewProps} from '../types';
import {getLocalMessage} from '../../../utils/locales';

export default function SiteToggleGroup(props: ViewProps) {
    const isPageEnabled = isURLEnabled(props.tab.url, props.data.settings, props.tab);
    const descriptionText = (() => {
        if (isPDF(props.tab.url)) {
            return getLocalMessage(isPageEnabled ? 'enabled_for_pdf_files' : 'disabled_for_pdf_files');
        }

        return getLocalMessage(isPageEnabled ? 'enabled_for_current_website' : 'disabled_for_current_website');
    })();
    const description = (
        <span
            class={{
                'site-toggle-group__description': true,
                'site-toggle-group__description--on': isPageEnabled,
                'site-toggle-group__description--off': !isPageEnabled,
            }}
        >{descriptionText}</span>
    );

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
