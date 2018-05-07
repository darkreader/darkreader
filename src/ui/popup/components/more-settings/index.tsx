import {html} from 'malevic';
import CustomSettingsToggle from '../custom-settings-toggle';
import EngineSwitch from '../engine-switch';
import FontSettings from '../font-settings';
import {Toggle, UpDown} from '../../../controls';
import {isFirefox} from '../../../../utils/platform';
import {isURLInList} from '../../../../utils/url';
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
                    Try out <strong>experimental</strong> theme engines:<br />
                    <strong>Filter+</strong> preserves colors saturation, uses GPU<br />
                    <strong>Static theme</strong> generates a simple fast theme<br />
                    <strong>Dynamic theme</strong> analyzes colors and images
                </p>
                <EngineSwitch engine={filterConfig.engine} onChange={(engine) => setConfig({engine})} />
            </div>
            {isFirefox() ? (
                <div class="more-settings__section">
                    <Toggle
                        checked={data.filterConfig.changeBrowserTheme}
                        labelOn="Browser theme"
                        labelOff="Default"
                        onChange={(checked) => actions.setConfig({changeBrowserTheme: checked})}
                    />
                    <p class="more-settings__description">
                        Change browser theme
                    </p>
                </div>
            ) : (
                    <div class="more-settings__section">
                        <CustomSettingsToggle data={data} tab={tab} actions={actions} />
                        {tab.isProtected ? (
                            <p class="more-settings__description more-settings__description--warning">
                                This page is protected by browser
                            </p>
                        ) : tab.isInDarkList ? (
                            <p class="more-settings__description more-settings__description--warning">
                                This site is in global Dark List
                            </p>
                        ) : (
                            <p class="more-settings__description">
                                Apply settings to current website only
                            </p>
                        )}
                    </div>
                )}
        </section>
    );
}

