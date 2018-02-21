import { html } from 'malevic';
import { Col, Toggle, TextList, Shortcut } from '../controls'
import { Extension } from '../../definitions';

export default function SiteListSettings({ ext }: { ext: Extension }) {

    function isSiteUrlValid(value: string) {
        return /^([^\.\s]+?\.?)+$/.test(value);
    }

    return (
        <Col>
            <Toggle
                checked={ext.config.invertListed}
                labelOn="Invert listed only"
                labelOff="Not invert listed"
                onChange={(value) => ext.setConfig({ invertListed: value })}
            />
            <TextList
                placeholder="mail.google.com, google.*/mail etc..."
                values={ext.config.siteList}
                onChange={(values) => {
                    if (values.every(isSiteUrlValid)) {
                        ext.setConfig({ siteList: values });
                    }
                }}
            />
            <Shortcut
                class="description"
                commandName="addSite"
                textTemplate={(hotkey) => (hotkey
                    ? `hotkey for adding site: ${hotkey}`
                    : 'setup a hotkey for adding site'
                )}
            />
        </Col>
    );
}
