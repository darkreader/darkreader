import {html, render} from 'malevic';
import {Button} from '../../../controls';
import {ExtensionData, ExtensionActions} from '../../../../definitions';

export default function SiteToggleButton({data, actions}: {data: ExtensionData, actions: ExtensionActions}) {
    const toggleHasEffect = (
        data.enabled &&
        !data.activeTab.isProtected &&
        (data.filterConfig.invertListed || !data.activeTab.isInDarkList)
    );

    const urlText = (data.activeTab.host
        ? data.activeTab.host
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
            onclick={() => actions.toggleCurrentSite()}
        >
            Toggle <span class="site-toggle__url" >{urlText}</span>
        </Button>
    );
}
