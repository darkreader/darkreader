import {m} from 'malevic';
import CheckmarkIcon from './checkmark-icon';
import {Button} from '../../../controls';
import {getURLHost, isURLEnabled, isPDF} from '../../../../utils/url';
import {ExtWrapper, TabInfo} from '../../../../definitions';

export default function SiteToggleButton({data, tab, actions}: ExtWrapper & {tab: TabInfo}) {

    function onSiteToggleClick() {
        if (pdf) {
            actions.changeSettings({enableForPDF: !data.settings.enableForPDF});
        } else {
            actions.toggleURL(tab.url);
        }
    }
    const toggleHasEffect = (
        data.isEnabled &&
        !tab.isProtected
    );
    const pdf = isPDF(tab.url);
    const isSiteEnabled = isURLEnabled(tab.url, data.settings, tab);
    const host = getURLHost(tab.url || '');

    const urlText = (host
        ? host
            .split('.')
            .reduce((elements, part, i) => elements.concat(
                <wbr />,
                `${i > 0 ? '.' : ''}${part}`
            ), [])
        : 'current site');

    return (
        <Button
            class={{
                'site-toggle': true,
                'site-toggle--active': pdf ? data.settings.enableForPDF : isSiteEnabled,
                'site-toggle--disabled': !toggleHasEffect
            }}
            onclick={onSiteToggleClick}
        >
            <span class="site-toggle__mark"><CheckmarkIcon isEnabled={isSiteEnabled} /></span>
            {' '}
            <span class="site-toggle__url" >{pdf ? 'PDF' : urlText}</span>
        </Button>
    );
}
