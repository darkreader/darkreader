import {m} from 'malevic';
import {ViewProps} from '../types';
import SiteList from './site-list';
import CheckButton from '../check-button';

export default function SiteListPage(props: ViewProps) {
    function onSiteListChange(sites: string[]) {
        props.actions.changeSettings({siteList: sites});
    }
    function onEnableForProtectedPages(value: boolean) {
        props.actions.changeSettings({enableForProtectedPages: value});
    }

    const label = props.data.settings.applyToListedOnly ?
        'Enable on these websites' :
        'Disable on these websites';
    return (
        <div class="site-list-page">
            <label class="site-list-page__label">{label}</label>
            <SiteList
                siteList={props.data.settings.siteList}
                onChange={onSiteListChange}
            />
            <label class="site-list-page__description">Enter website name and press Enter</label>
            <CheckButton
                checked={props.data.settings.enableForProtectedPages}
                onChange={onEnableForProtectedPages}
                label={'Enable on protected pages'}
                description={props.data.settings.enableForProtectedPages ?
                    'Will try running on protected pages (browser settings etc)' :
                    'Will not try running on protected pages (browser settings etc)'}
            />
        </div>
    );
}
