import {html, render} from 'malevic';
import {Button} from '../../../controls';
import {getURLHost, isURLInList} from '../../../../utils/url';
import {ExtWrapper, TabInfo} from '../../../../definitions';

export default function CustomSettingsToggle({data, tab, actions}: ExtWrapper & {tab: TabInfo}) {
    const host = getURLHost(tab.url || '');

    const isCustom = data.filterConfig.custom.some(({url}) => isURLInList(tab.url, url));

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
                'custom-settings-toggle': true,
                'custom-settings-toggle--checked': isCustom,
                'custom-settings-toggle--disabled': tab.isProtected || (tab.isInDarkList && !data.filterConfig.invertListed),
            }}
            onclick={(e) => {
                if (isCustom) {
                    const filtered = data.filterConfig.custom.filter(({url}) => !isURLInList(tab.url, url));
                    actions.setConfig({custom: filtered});
                } else {
                    const {mode, brightness, contrast, grayscale, sepia, useFont, fontFamily, textStroke, engine} = data.filterConfig;
                    const extended = data.filterConfig.custom.concat({
                        url: [host],
                        config: {mode, brightness, contrast, grayscale, sepia, useFont, fontFamily, textStroke, engine},
                    });
                    actions.setConfig({custom: extended});
                    (e.currentTarget as HTMLElement).classList.add('custom-settings-toggle--checked'); // Speed-up reaction
                }
            }}
        >
            Apply to <span class="custom-settings-toggle__url" >{urlText}</span>
        </Button>
    );
}
