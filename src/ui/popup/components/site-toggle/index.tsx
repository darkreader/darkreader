import { m } from 'malevic';
import CheckmarkIcon from './checkmark-icon';
import { Button } from '../../../controls';
import {
    getURLHostOrProtocol,
    isURLEnabled,
    isPDF,
} from '../../../../utils/url';
import type { ExtWrapper } from '../../../../definitions';

declare const __THUNDERBIRD__: boolean;

export default function SiteToggleButton({ data, actions }: ExtWrapper) {
    const tab = data.activeTab;

    function onSiteToggleClick() {
        if (pdf) {
            actions.changeSettings({
                enableForPDF: !data.settings.enableForPDF,
            });
        } else {
            actions.toggleActiveTab();
        }
    }

    const pdf = isPDF(tab.url);
    const toggleHasEffect =
        data.settings.enableForProtectedPages ||
        (!tab.isProtected && !pdf) ||
        tab.isInjected;
    const isSiteEnabled: boolean =
        isURLEnabled(
            tab.url,
            data.settings,
            tab,
            data.isAllowedFileSchemeAccess,
        ) && Boolean(tab.isInjected);
    const host = getURLHostOrProtocol(tab.url);

    const urlText = host
        .split('.')
        .reduce<string[]>(
            (elements, part, i) =>
                elements.concat(<wbr />, `${i > 0 ? '.' : ''}${part}`),
            [],
        );

    return (
        <Button
            class={{
                'site-toggle': true,
                'site-toggle--active': isSiteEnabled,
                'site-toggle--disabled': __THUNDERBIRD__ || !toggleHasEffect,
            }}
            onclick={onSiteToggleClick}
        >
            <span class='site-toggle__mark'>
                <CheckmarkIcon isChecked={isSiteEnabled} />
            </span>{' '}
            <span class='site-toggle__url'>{pdf ? 'PDF' : urlText}</span>
        </Button>
    );
}
