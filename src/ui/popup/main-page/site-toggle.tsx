import {m} from 'malevic';
import {isURLEnabled, isPDF} from '../../../utils/url';
import SiteToggle from '../components/site-toggle';
import ControlGroup from '../control-group';
import type {ViewProps} from '../types';

export default function SiteToggleGroup(props: ViewProps) {
    const tab = props.data.activeTab;
    const isPageEnabled = isURLEnabled(tab.url, props.data.settings, tab);
    const {isDarkThemeDetected} = tab;
    const descriptionText = isPDF(tab.url) ? (
        isPageEnabled ? 'Enabled for PDF files' : 'Disabled for PDF files'
    ) : isDarkThemeDetected ? 'Dark theme detected on page' : (
        isPageEnabled ? 'Enabled for current website' : 'Disabled for current website'
    );
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
