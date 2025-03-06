import {m} from 'malevic';

import type {ExtWrapper} from '../../../../definitions';
import {getURLHostOrProtocol, isURLEnabled, isPDF} from '../../../../utils/url';
import {Button} from '../../../controls';

import CheckmarkIcon from './checkmark-icon';

declare const __THUNDERBIRD__: boolean;

export function getSiteToggleData(props: ExtWrapper) {
    const {data, actions} = props;
    const tab = data.activeTab;

    function onSiteToggleClick() {
        if (pdf) {
            actions.changeSettings({enableForPDF: !data.settings.enableForPDF});
        } else {
            actions.toggleActiveTab();
        }
    }

    const pdf = isPDF(tab.url);
    const toggleHasEffect = (
        data.settings.enableForProtectedPages ||
        (!tab.isProtected && !pdf) ||
        tab.isInjected
    );
    const isSiteEnabled: boolean = isURLEnabled(tab.url, data.settings, tab, data.isAllowedFileSchemeAccess) && Boolean(tab.isInjected);
    const host = getURLHostOrProtocol(tab.url);
    const displayHost = host.startsWith('www.') ? host.substring(4) : host;

    const urlText = pdf ? 'PDF' : displayHost
        .split('.')
        .reduce<string[]>((elements, part, i) => elements.concat(
            i > 0 ? <wbr /> : null,
            `${i > 0 ? '.' : ''}${part}`
        ), []);

    return {urlText, onSiteToggleClick, toggleHasEffect, isSiteEnabled};
}

export default function SiteToggleButton(props: ExtWrapper) {
    const {urlText, onSiteToggleClick, toggleHasEffect, isSiteEnabled} = getSiteToggleData(props);

    return (
        <Button
            class={{
                'site-toggle': true,
                'site-toggle--active': isSiteEnabled,
                'site-toggle--disabled': __THUNDERBIRD__ || !toggleHasEffect,
            }}
            onclick={onSiteToggleClick}
        >
            <span class="site-toggle__mark"><CheckmarkIcon isChecked={isSiteEnabled} /></span>
            {' '}
            <span class="site-toggle__url" >{urlText}</span>
        </Button>
    );
}
