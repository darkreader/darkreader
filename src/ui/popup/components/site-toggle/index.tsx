import {html} from 'malevic';
import {Button} from '../../../controls';
import {getURLHost, isURLEnabled} from '../../../../utils/url';
import {ExtWrapper, TabInfo} from '../../../../definitions';

export default function SiteToggleButton({data, tab, actions}: ExtWrapper & {tab: TabInfo}) {
    const toggleHasEffect = (
        data.isEnabled &&
        !tab.isProtected &&
        (data.settings.applyToListedOnly || !tab.isInDarkList)
    );
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
                'site-toggle--active': isSiteEnabled,
                'site-toggle--disabled': !toggleHasEffect
            }}
            onclick={() => actions.toggleSitePattern(host)}
        >
            <span class="site-toggle__url" ><span class="site-toggle__mark"></span> {urlText}</span>
        </Button>
    );
}
