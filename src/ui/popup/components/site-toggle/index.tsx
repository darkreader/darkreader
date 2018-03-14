import {html, render} from 'malevic';
import {Button} from '../../../controls';
import {getUrlHost} from '../../../../background/utils';
import {ExtWrapper, TabInfo} from '../../../../definitions';

export default function SiteToggleButton({data, tab, actions}: ExtWrapper & {tab: TabInfo}) {
    const toggleHasEffect = (
        data.enabled &&
        !tab.isProtected &&
        (data.filterConfig.invertListed || !tab.isInDarkList)
    );

    const host = getUrlHost(tab.url || '');

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
                'site-toggle--disabled': !toggleHasEffect
            }}
            onclick={() => actions.toggleSitePattern(host)}
        >
            Toggle <span class="site-toggle__url" >{urlText}</span>
        </Button>
    );
}
