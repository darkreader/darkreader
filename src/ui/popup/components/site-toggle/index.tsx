import {m} from 'malevic';
import CheckmarkIcon from './checkmark-icon';
import {Button} from '../../../controls';
import {getURLHostOrProtocol, isURLEnabled, isPDF} from '../../../../utils/url';
import type {ExtWrapper, TabInfo} from '../../../../definitions';
import {isThunderbird} from '../../../../utils/platform';

export default function SiteToggleButton({data, tab, actions}: ExtWrapper & {tab: TabInfo}) {
    function onSiteToggleClick() {
        if (pdf) {
            actions.changeSettings({enableForPDF: !data.settings.enableForPDF});
        } else {
            actions.toggleURL(tab.url);
        }
    }
    const toggleHasEffect = (
        data.settings.enableForProtectedPages ||
        !tab.isProtected
    );
    const pdf = isPDF(tab.url);
    const isSiteEnabled = isURLEnabled(tab.url, data.settings, tab);
    const host = getURLHostOrProtocol(tab.url);

    const urlText = host
        .split('.')
        .reduce((elements, part, i) => elements.concat(
            <wbr />,
            `${i > 0 ? '.' : ''}${part}`
        ), []);

    return (
        <Button
            class={{
                'site-toggle': true,
                'site-toggle--active': isSiteEnabled,
                'site-toggle--disabled': !toggleHasEffect || isThunderbird
            }}
            onclick={onSiteToggleClick}
        >
            <span class="site-toggle__mark"><CheckmarkIcon isChecked={isSiteEnabled} /></span>
            {' '}
            <span class="site-toggle__url" >{pdf ? 'PDF' : urlText}</span>
        </Button>
    );
}
