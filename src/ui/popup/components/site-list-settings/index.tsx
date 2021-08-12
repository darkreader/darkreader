import {m} from 'malevic';
import {Toggle, TextList, Shortcut} from '../../../controls';
import {getLocalMessage} from '../../../../utils/locales';
import type {ExtWrapper} from '../../../../definitions';

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
                checked={data.settings.applyToListedOnly}
                labelOn={getLocalMessage('invert_listed_only')}
                labelOff={getLocalMessage('not_invert_listed')}
                onChange={(value) => actions.changeSettings({applyToListedOnly: value})}
            />
            <TextList
                class="site-list-settings__text-list"
                placeholder="google.com/maps"
                values={data.settings.siteList}
                isFocused={isFocused}
                onChange={(values) => {
                    if (values.every(isSiteUrlValid)) {
                        actions.changeSettings({siteList: values});
                    }
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
