import {m} from 'malevic';
import {isChromium} from '../../../utils/platform';
import {getLocalMessage} from '../../../utils/locales';
import {isURLEnabled, isPDF, isLocalFile} from '../../../utils/url';
import SiteToggle from '../components/site-toggle';
import {ControlGroup} from '../../controls';
import type {ViewProps} from '../../../definitions';

export default function SiteToggleGroup(props: ViewProps) {
    const tab = props.data.activeTab;
    const isPageEnabled = isURLEnabled(tab.url, props.data.settings, tab, props.data.isAllowedFileSchemeAccess);
    const isFile = isChromium && isLocalFile(tab.url);
    const {isDarkThemeDetected, isProtected, isInDarkList} = tab;
    let descriptionText = '';

    if (isFile && !props.data.isAllowedFileSchemeAccess) {
        descriptionText = getLocalMessage('local_files_forbidden');
    } else if (isPDF(tab.url)) {
        descriptionText = isPageEnabled ? getLocalMessage('enabled_for_pdf') : getLocalMessage('disabled_for_pdf');
    } else if (isDarkThemeDetected) {
        descriptionText = getLocalMessage('dark_theme_detected_on_page');
    } else if (isPageEnabled) {
        descriptionText = getLocalMessage('enabled_for_current_website');
    } else if (isProtected) {
        descriptionText = getLocalMessage('page_protected');
    } else if (isInDarkList) {
        descriptionText = getLocalMessage('page_in_dark_list');
    } else {
        descriptionText = getLocalMessage('disabled_for_current_website');
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
