import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';

import {ClearSiteList} from './clear-site-list';
import {SiteList} from './site-list';

export function SiteListTab(props: ViewProps): Malevic.Child {
    const {settings} = props.data;
    const {enabledByDefault} = settings;

    function onSiteListChange(sites: string[]) {
        const changes = enabledByDefault
            ? {disabledFor: sites}
            : {enabledFor: sites};
        props.actions.changeSettings(changes);
    }

    const label = enabledByDefault ?
        'Disable on these websites' :
        'Enable on these websites';

    const sites = enabledByDefault
        ? settings.disabledFor
        : settings.enabledFor;
    return <div class="settings-tab site-list-tab">
        <label class="site-list-tab__label">{label}</label>
        <SiteList
            siteList={sites}
            onChange={onSiteListChange}
        />
        <ClearSiteList {...props} />
    </div>;
}
