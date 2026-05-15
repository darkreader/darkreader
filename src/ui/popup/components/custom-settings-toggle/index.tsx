import {m} from 'malevic';

import type {ExtWrapper, Theme} from '../../../../definitions';
import {getLocalMessage} from '../../../../utils/locales';
import {getURLHostOrProtocol, isURLInList} from '../../../../utils/url';
import {Button} from '../../../controls';

declare const __THUNDERBIRD__: boolean;

function themesAreEqual(a: Theme, b: Theme) {
    return Object.keys(a).every((key) => a[key as keyof Theme] === b[key as keyof Theme]);
}

export default function CustomSettingsToggle({data, actions}: ExtWrapper) {
    const tab = data.activeTab;
    const host = getURLHostOrProtocol(tab.url);

    const custom = data.settings.customThemes.find(({url}) => isURLInList(tab.url, url));
    const isCustom = Boolean(custom);
    const hasCustomThemeChanges = custom ? !themesAreEqual(custom.theme, data.settings.theme) : false;

    function resetSiteSettings() {
        const filtered = data.settings.customThemes.filter(({url}) => !isURLInList(tab.url, url));
        actions.changeSettings({customThemes: filtered});
    }

    const urlText = host
        .split('.')
        .reduce<string[]>((elements, part, i) => elements.concat(
            <wbr />,
            `${i > 0 ? '.' : ''}${part}`
        ), []);

    const resetSiteSettingsLabel = getLocalMessage('reset_site_settings') || 'Reset site settings';

    return (
        <span class="custom-settings-toggle__group">
            <Button
                class={{
                    'custom-settings-toggle': true,
                    'custom-settings-toggle--checked': isCustom,
                    'custom-settings-toggle--disabled': __THUNDERBIRD__ || tab.isProtected,
                }}
                onclick={(e) => {
                    if (isCustom) {
                        resetSiteSettings();
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
            {hasCustomThemeChanges ? (
                <Button
                    class="custom-settings-toggle__reset"
                    onclick={resetSiteSettings}
                >
                    <span class="custom-settings-toggle__reset__text">
                        {resetSiteSettingsLabel === 'reset_site_settings' ? 'Reset site settings' : resetSiteSettingsLabel}
                    </span>
                </Button>
            ) : null}
        </span>
    );
}
