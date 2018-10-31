import {html} from 'malevic';
import CustomSettingsToggle from '../custom-settings-toggle';
import EngineSwitch from '../engine-switch';
import FontSettings from '../font-settings';
import {Toggle, TextList, Shortcut} from '../../../controls'
import {isFirefox} from '../../../../utils/platform';
import {isURLInList} from '../../../../utils/url';
import {compileMarkdown} from '../../utils/markdown';
import {getLocalMessage} from '../../../../utils/locales';
import {ExtWrapper, FilterConfig, TabInfo} from '../../../../definitions';

interface SiteListSettingsProps extends ExtWrapper {
    isFocused: boolean;
}
export default function CBSettings({data, actions, tab}: ExtWrapper & {tab: TabInfo}) {
//export default function MoreSettings({data, actions, tab}: ExtWrapper & {tab: TabInfo} & {data, actions, isFocused: SiteListSettingsProps}) {

    const custom = data.settings.customThemes.find(({url}) => isURLInList(tab.url, url));
    const filterConfig = custom ? custom.theme : data.settings.theme;

    function setConfig(config: Partial<FilterConfig>) {
        if (custom) {
            custom.theme = {...custom.theme, ...config};
            actions.changeSettings({customThemes: data.settings.customThemes});
        } else {
            actions.setTheme(config)
        }
    }

    function isSiteUrlValid(value: string) {
        return /^([^\.\s]+?\.?)+$/.test(value);
    }

    return (
        <section class="more-settings">
            <div class="more-settings__section">
                <FontSettings config={filterConfig} fonts={data.fonts} onChange={setConfig} />
            </div>
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
                //isFocused={isFocused}
                //this boolean is having issue "cannot find isFocused" 
                //commented it out for now, need to revisit later
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
   
            <div class="more-settings__section">
                <CustomSettingsToggle data={data} tab={tab} actions={actions} />
                {tab.isProtected ? (
                    <p class="more-settings__description more-settings__description--warning">
                        {getLocalMessage('page_protected').replace('\n', ' ')}
                    </p>
                ) : tab.isInDarkList ? (
                    <p class="more-settings__description more-settings__description--warning">
                        {getLocalMessage('page_in_dark_list').replace('\n', ' ')}
                    </p>
                ) : (
                            <p class="more-settings__description">
                                {getLocalMessage('only_for_description')}
                            </p>
                        )}
            </div>
            {isFirefox() ? (
                <div class="more-settings__section">
                    <Toggle
                        checked={data.settings.changeBrowserTheme}
                        labelOn={getLocalMessage('custom_browser_theme_on')}
                        labelOff={getLocalMessage('custom_browser_theme_off')}
                        onChange={(checked) => actions.changeSettings({changeBrowserTheme: checked})}
                    />
                    <p class="more-settings__description">
                        {getLocalMessage('change_browser_theme')}
                    </p>
                </div>
            ) : null}
            
            
        </section>
        
    );
}

/*
Removed display of engine switching stuff:
<div class="more-settings__section">
                <EngineSwitch engine={filterConfig.engine} onChange={(engine) => setConfig({engine})} />
            </div>
*/
