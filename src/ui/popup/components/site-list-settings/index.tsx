import {m} from 'malevic';

import type {ExtWrapper} from '../../../../definitions';
import {getLocalMessage} from '../../../../utils/locales';
import {Toggle, TextList, Shortcut} from '../../../controls';

interface SiteListSettingsProps extends ExtWrapper {
    isFocused: boolean;
}

export default function SiteListSettings({data, actions, isFocused}: SiteListSettingsProps) {
    function isSiteUrlValid(value: string) {
        return /^([^\.\s]+?\.?)+$/.test(value);
    }

    return (
        <section class="site-list-settings">
            <Toggle
                class="site-list-settings__toggle"
                checked={!data.settings.enabledByDefault}
                labelOn={getLocalMessage('invert_listed_only')}
                labelOff={getLocalMessage('not_invert_listed')}
                onChange={(value) => actions.changeSettings({enabledByDefault: !value})}
            />
            <TextList
                class="site-list-settings__text-list"
                placeholder="google.com/maps"
                values={data.settings.enabledByDefault ? data.settings.disabledFor : data.settings.enabledFor}
                isFocused={isFocused}
                onChange={(values) => {
                    const siteList = values.filter(isSiteUrlValid);
                    const changes = data.settings.enabledByDefault
                        ? {disabledFor: siteList}
                        : {enabledFor: siteList};
                    actions.changeSettings(changes);
                }}
            />
            <Shortcut
                class="site-list-settings__shortcut"
                commandName="addSite"
                shortcuts={data.shortcuts}
                textTemplate={(hotkey) => (hotkey
                    ? `${getLocalMessage('add_site_to_list')}: ${hotkey}`
                    : getLocalMessage('setup_add_site_hotkey')
                )}
                onSetShortcut={(shortcut) => actions.setShortcut('addSite', shortcut)}
            />
        </section>
    );
}
