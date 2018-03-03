import {html} from 'malevic';
import {Toggle, TextList, Shortcut} from '../../../controls'
import {Extension} from '../../../../definitions';

interface SiteListSettingsProps {
    ext: Extension;
    isFocused: boolean;
}

export default function SiteListSettings({ext, isFocused}: SiteListSettingsProps) {

    function isSiteUrlValid(value: string) {
        return /^([^\.\s]+?\.?)+$/.test(value);
    }

    return (
        <section class="site-list-settings">
            <Toggle
                class="site-list-settings__toggle"
                checked={ext.filterConfig.invertListed}
                labelOn="Invert listed only"
                labelOff="Not invert listed"
                onChange={(value) => ext.setConfig({invertListed: value})}
            />
            <TextList
                class="site-list-settings__text-list"
                placeholder="mail.google.com, google.*/mail etc..."
                values={ext.filterConfig.siteList}
                isFocused={isFocused}
                onChange={(values) => {
                    if (values.every(isSiteUrlValid)) {
                        ext.setConfig({siteList: values});
                    }
                }}
            />
            <Shortcut
                class="site-list-settings__shortcut"
                commandName="addSite"
                textTemplate={(hotkey) => (hotkey
                    ? `hotkey for adding site: ${hotkey}`
                    : 'setup a hotkey for adding site'
                )}
            />
        </section>
    );
}
