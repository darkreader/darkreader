import {m} from 'malevic';
import type {ViewProps} from '../../../definitions';
import {SiteList} from '../../options/site-list/site-list';
import {CheckButton} from '../../controls';
import {ClearSiteList} from '../../options/site-list/clear-site-list';
import {isFirefox} from '../../../utils/platform';

export default function SiteListPage(props: ViewProps) {
    const {settings} = props.data;
    const {enabledByDefault} = settings;

    function onSiteListChange(sites: string[]) {
        const changes = enabledByDefault
            ? {disabledFor: sites}
            : {enabledFor: sites};
        props.actions.changeSettings(changes);
    }

    function onInvertPDFChange(checked: boolean) {
        props.actions.changeSettings({enableForPDF: checked});
    }

    function onEnableForProtectedPages(value: boolean) {
        props.actions.changeSettings({enableForProtectedPages: value});
    }

    const label = enabledByDefault ?
        'Disable on these websites' :
        'Enable on these websites';

    const sites = enabledByDefault
        ? settings.disabledFor
        : settings.enabledFor;

    return (
        <div class="site-list-page">
            <label class="site-list-page__label">{label}</label>
            {sites.length ? <ClearSiteList {...props} /> : null}
            <SiteList
                siteList={sites}
                onChange={onSiteListChange}
            />
            <label class="site-list-page__description">Enter website name and press Enter</label>
            {isFirefox ? null : <CheckButton
                checked={settings.enableForPDF}
                label="Enable for PDF files"
                description={settings.enableForPDF ?
                    'Enabled for PDF documents' :
                    'Disabled for PDF documents'}
                onChange={onInvertPDFChange}
            />}
            <CheckButton
                checked={settings.enableForProtectedPages}
                onChange={onEnableForProtectedPages}
                label={'Enable on restricted pages'}
                description={settings.enableForProtectedPages ?
                    'You should enable it in browser flags too' :
                    'Disabled for web store and other pages'}
            />
        </div>
    );
}
