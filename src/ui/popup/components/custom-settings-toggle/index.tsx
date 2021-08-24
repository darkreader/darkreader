import {m} from 'malevic';
import {Button} from '../../../controls';
import {getURLHostOrProtocol, isURLInList} from '../../../../utils/url';
import {getLocalMessage} from '../../../../utils/locales';
import type {ExtWrapper, TabInfo} from '../../../../definitions';
import {isThunderbird} from '../../../../utils/platform';

export default function CustomSettingsToggle({data, tab, actions}: ExtWrapper & {tab: TabInfo}) {
    const host = getURLHostOrProtocol(tab.url);

    const isCustom = data.settings.customThemes.some(({url}) => isURLInList(tab.url, url));

    const urlText = host
        .split('.')
        .reduce((elements, part, i) => elements.concat(
            <wbr />,
            `${i > 0 ? '.' : ''}${part}`
        ), []);

    return (
        <Button
            class={{
                'custom-settings-toggle': true,
                'custom-settings-toggle--checked': isCustom,
                'custom-settings-toggle--disabled': tab.isProtected || isThunderbird,
            }}
            onclick={(e) => {
                if (isCustom) {
                    const filtered = data.settings.customThemes.filter(({url}) => !isURLInList(tab.url, url));
                    actions.changeSettings({customThemes: filtered});
                } else {
                    const extended = data.settings.customThemes.concat({
                        url: [host],
                        theme: {...data.settings.theme},
                    });
                    actions.changeSettings({customThemes: extended});
                    (e.currentTarget as HTMLElement).classList.add('custom-settings-toggle--checked'); // Speed-up reaction
                }
            }}
        >
            <span class="custom-settings-toggle__wrapper">
                {getLocalMessage('only_for')} <span class="custom-settings-toggle__url" >{urlText}</span>
            </span>
        </Button>
    );
}
