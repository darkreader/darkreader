import {html} from 'malevic';
import CustomSettingsToggle from '../custom-settings-toggle';
import EngineSwitch from '../engine-switch';
import FontSettings from '../font-settings';
import {Toggle, UpDown} from '../../../controls';
import {isFirefox} from '../../../../utils/platform';
import {isURLInList} from '../../../../utils/url';
import {compileMarkdown} from '../../utils/markdown';
import {getLocalMessage} from '../../../../utils/locales';
import {ExtWrapper, FilterConfig, TabInfo} from '../../../../definitions';

export default function MoreSettings({data, actions, tab}: ExtWrapper & {tab: TabInfo}) {

    const custom = data.filterConfig.custom.find(({url}) => isURLInList(tab.url, url));
    const filterConfig = custom ? custom.config : data.filterConfig;

    function setConfig(config: FilterConfig) {
        if (custom) {
            custom.config = {...custom.config, ...config};
            actions.setConfig({custom: data.filterConfig.custom});
        } else {
            actions.setConfig(config)
        }
    }

    return (
        <section class="more-settings">
            <div class="more-settings__section">
                <FontSettings config={filterConfig} fonts={data.fonts} onChange={setConfig} />
            </div>
            <div class="more-settings__section">
                <p class="more-settings__description">
                    {compileMarkdown(getLocalMessage('try_experimental_theme_engines'))}
                </p>
                <EngineSwitch engine={filterConfig.engine} onChange={(engine) => setConfig({engine})} />
            </div>
            {isFirefox() ? (
                <div class="more-settings__section">
                    <Toggle
                        checked={data.filterConfig.changeBrowserTheme}
                        labelOn={getLocalMessage('custom_browser_theme_on')}
                        labelOff={getLocalMessage('custom_browser_theme_off')}
                        onChange={(checked) => actions.setConfig({changeBrowserTheme: checked})}
                    />
                    <p class="more-settings__description">
                        {getLocalMessage('change_browser_theme')}
                    </p>
                </div>
            ) : (
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
                )}
        </section>
    );
}

