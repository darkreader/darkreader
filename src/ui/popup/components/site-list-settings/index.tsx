import {html} from 'malevic';
import {Toggle, TextList, Shortcut} from '../../../controls'
import {ExtWrapper} from '../../../../definitions';

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
                checked={data.filterConfig.invertListed}
                labelOn="Invert listed only"
                labelOff="Not invert listed"
                onChange={(value) => actions.setConfig({invertListed: value})}
            />
            <TextList
                class="site-list-settings__text-list"
                placeholder="mail.google.com, google.*/mail etc..."
                values={data.filterConfig.siteList}
                isFocused={isFocused}
                onChange={(values) => {
                    if (values.every(isSiteUrlValid)) {
                        actions.setConfig({siteList: values});
                    }
                }}
            />
            <Shortcut
                class="site-list-settings__shortcut"
                commandName="addSite"
                shortcuts={data.shortcuts}
                textTemplate={(hotkey) => (hotkey
                    ? `hotkey for adding site: ${hotkey}`
                    : 'setup a hotkey for adding site'
                )}
                onSetShortcut={(shortcut) => actions.setShortcut('addSite', shortcut)}
            />
        </section>
    );
}
