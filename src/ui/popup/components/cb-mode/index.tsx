import {html} from 'malevic';
import {Toggle} from '../../../controls';
import LinkSettings from '../link-settings';
import {isFirefox} from '../../../../utils/platform';
import {isURLInList} from '../../../../utils/url';
import {compileMarkdown} from '../../utils/markdown';
import {getLocalMessage} from '../../../../utils/locales';
import {ExtWrapper, FilterConfig, TabInfo} from '../../../../definitions';

export default function CBMode({data, actions, tab}: ExtWrapper & {tab: TabInfo}) {

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
        <section class="cb-mode">
            <div class="cb-mode__section">
            <LinkSettings config={filterConfig} onChange={setConfig} />
            </div>
            <div class="cb-mode__section">
                Clicked Color: <input class="jscolor" value="ab2567"/>
            </div>
            {isFirefox() ? (
                <div class="cb-mode__section">
                    <Toggle
                        checked={data.settings.changeBrowserTheme}
                        labelOn={getLocalMessage('custom_browser_theme_on')}
                        labelOff={getLocalMessage('custom_browser_theme_off')}
                        onChange={(checked) => actions.changeSettings({changeBrowserTheme: checked})}
                    />
                    <p class="cb-mode__description">
                        {getLocalMessage('change_browser_theme')}
                    </p>
                </div>
            ) : null}
        </section>
    );
}

