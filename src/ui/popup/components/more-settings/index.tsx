import {m} from 'malevic';
import CustomSettingsToggle from '../custom-settings-toggle';
import EngineSwitch from '../engine-switch';
import FontSettings from '../font-settings';
import {Toggle} from '../../../controls';
import {isFirefox} from '../../../../utils/platform';
import {isURLInList} from '../../../../utils/url';
import {compileMarkdown} from '../../utils/markdown';
import {getLocalMessage} from '../../../../utils/locales';
import {ExtWrapper, FilterConfig, TabInfo} from '../../../../definitions';

export default function MoreSettings({data, actions, tab}: ExtWrapper & {tab: TabInfo}) {

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

    return (
        <section class="more-settings">
            <div class="more-settings__section">
                <FontSettings config={filterConfig} fonts={data.fonts} onChange={setConfig} />
            </div>
            <div class="more-settings__section">
                {isFirefox() ? null : <p class="more-settings__description">
                    {/* {compileMarkdown(getLocalMessage('try_experimental_theme_engines'))} */}
                </p>}
                {/* <EngineSwitch engine={filterConfig.engine} onChange={(engine) => setConfig({engine})} /> */}
            </div>
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

