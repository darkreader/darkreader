import {html} from 'malevic';
import {Button} from '../../../controls';
import {getURLHost, isURLInList} from '../../../../utils/url';
import {getLocalMessage} from '../../../../utils/locales';
import {ExtWrapper, TabInfo} from '../../../../definitions';

export default function CustomSettingsToggle({data, tab, actions}: ExtWrapper & {tab: TabInfo}) {
    const host = getURLHost(tab.url || '');

    const isCustom = data.settings.customThemes.some(({url}) => isURLInList(tab.url, url));

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
                'custom-settings-toggle--disabled': tab.isProtected || (tab.isInDarkList && !data.settings.applyToListedOnly),
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
