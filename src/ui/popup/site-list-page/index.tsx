import {m} from 'malevic';
import {ViewProps} from '../types';
import SiteList from './site-list';

export default function SiteListPage(props: ViewProps) {
    function onSiteListChange(sites: string[]) {
        props.actions.changeSettings({siteList: sites});
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
                autoFocus
            />
        </div>
    );
}
