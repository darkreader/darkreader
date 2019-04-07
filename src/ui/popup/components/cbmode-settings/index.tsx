import {html} from 'malevic';
import CustomSettingsToggle from '../custom-settings-toggle';
import EngineSwitch from '../engine-switch';
import FontSettings from '../font-settings';
import CBSettings from '../cb-settings';
import {Toggle} from '../../../controls';
import {isURLInList} from '../../../../utils/url';
import {compileMarkdown} from '../../utils/markdown';
import {getLocalMessage} from '../../../../utils/locales';
import {ExtWrapper, FilterConfig, TabInfo} from '../../../../definitions';

export default function CBModeSettings({data, actions, tab}: ExtWrapper & {tab: TabInfo}) {

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
        <section class="cbmode-settings">
            <div class="cbmode-settings__section">
                <CBSettings config={filterConfig} fonts={data.fonts} onChange={setConfig} />
            </div>
            
        </section>
    );
}

