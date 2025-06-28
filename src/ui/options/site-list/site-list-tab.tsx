import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';

import {ClearSiteList} from './clear-site-list';
import {SiteList} from './site-list';
import {getLocalMessage} from '../../../utils/locales';

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
        getLocalMessage('disable_on_these_sites') :
        getLocalMessage('enable_on_these_sites');

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
