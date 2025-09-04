import {m} from 'malevic';

import type {ExtWrapper, Theme} from '../../../../definitions';
import {getLocalMessage} from '../../../../utils/locales';
import {isURLInList} from '../../../../utils/url';
import {Button} from '../../../controls';
import {SettingsIcon} from '../../../icons';
import {openExtensionPage} from '../../../utils';
import CustomSettingsToggle from '../custom-settings-toggle';
import EngineSwitch from '../engine-switch';

async function openSettings() {
    await openExtensionPage('options');
}

export default function MoreSettings({data, actions}: ExtWrapper) {
    const tab = data.activeTab;
    const custom = data.settings.customThemes.find(({url}) => isURLInList(tab.url, url));
    const theme = custom ? custom.theme : data.settings.theme;

    function setConfig(config: Partial<Theme>) {
        if (custom) {
            custom.theme = {...custom.theme, ...config};
            actions.changeSettings({customThemes: data.settings.customThemes});
        } else {
            actions.setTheme(config);
        }
    }

    return (
        <section class="more-settings">
            <div class="more-settings__section">
                <EngineSwitch engine={theme.engine} onChange={(engine) => setConfig({engine})} />
            </div>
            <div class="more-settings__section">
                <CustomSettingsToggle data={data} actions={actions} />
                {tab.isProtected ? (
                    <p class="more-settings__description more-settings__description--warning">
                        {getLocalMessage('page_protected').replace(/\n/g, ' ')}
                    </p>
                ) : tab.isInDarkList ? (
                    <p class="more-settings__description more-settings__description--warning">
                        {getLocalMessage('page_in_dark_list').replace(/\n/g, ' ')}
                    </p>
                ) : (
                    <p class="more-settings__description">
                        {getLocalMessage('only_for_description')}
                    </p>
                )}
            </div>
            <div class="more-settings__section">
                <Button onclick={openSettings} class="more-settings__settings-button">
                    <span class="more-settings__settings-button__wrapper">
                        <span class="more-settings__settings-button__icon">
                            <SettingsIcon />
                        </span>
                        <span class="more-settings__settings-button__text">
                            {getLocalMessage('all_settings')}
                        </span>
                    </span>
                </Button>
            </div>
        </section>
    );
}
