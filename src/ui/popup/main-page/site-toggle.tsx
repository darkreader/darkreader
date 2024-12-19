import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {getLocalMessage} from '../../../utils/locales';
import {isChromium} from '../../../utils/platform';
import {isURLEnabled, isPDF, isLocalFile} from '../../../utils/url';
import {ControlGroup} from '../../controls';
import SiteToggle from '../components/site-toggle';

export default function SiteToggleGroup(props: ViewProps) {
    const tab = props.data.activeTab;
    const isPageEnabled = isURLEnabled(tab.url, props.data.settings, tab, props.data.isAllowedFileSchemeAccess);
    const isFile = isChromium && isLocalFile(tab.url);
    const {isDarkThemeDetected, isProtected, isInDarkList} = tab;
    let descriptionText = '';

    if (isFile && !props.data.isAllowedFileSchemeAccess) {
        descriptionText = getLocalMessage('local_files_forbidden');
    } else if (isPDF(tab.url)) {
        descriptionText = isPageEnabled ? 'Enabled for PDF files' : 'Disabled for PDF files';
    } else if (isDarkThemeDetected) {
        descriptionText = 'Dark theme detected on page';
    } else if (isPageEnabled) {
        descriptionText = 'Enabled for current website';
    } else if (isProtected) {
        descriptionText = getLocalMessage('page_protected');
    } else if (isInDarkList) {
        descriptionText = getLocalMessage('page_in_dark_list');
    } else {
        descriptionText = 'Disabled for current website';
    }

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
