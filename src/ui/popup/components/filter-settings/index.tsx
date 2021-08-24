import {m} from 'malevic';
import {UpDown} from '../../../controls';
import CustomSettingsToggle from '../custom-settings-toggle';
import ModeToggle from './mode-toggle';
import {getLocalMessage} from '../../../../utils/locales';
import {isURLInList} from '../../../../utils/url';
import type {ExtWrapper, TabInfo, FilterConfig} from '../../../../definitions';

export default function FilterSettings({data, actions, tab}: ExtWrapper & {tab: TabInfo}) {
    const custom = data.settings.customThemes.find(({url}) => isURLInList(tab.url, url));
    const filterConfig = custom ? custom.theme : data.settings.theme;

    function setConfig(config: Partial<FilterConfig>) {
        if (custom) {
            custom.theme = {...custom.theme, ...config};
            actions.changeSettings({customThemes: data.settings.customThemes});
        } else {
            actions.setTheme(config);
        }
    }

    const brightness = (
        <UpDown
            value={filterConfig.brightness}
            min={50}
            max={150}
            step={5}
            default={100}
            name={getLocalMessage('brightness')}
            onChange={(value) => setConfig({brightness: value})}
        />
    );

    const contrast = (
        <UpDown
            value={filterConfig.contrast}
            min={50}
            max={150}
            step={5}
            default={100}
            name={getLocalMessage('contrast')}
            onChange={(value) => setConfig({contrast: value})}
        />
    );

    const grayscale = (
        <UpDown
            value={filterConfig.grayscale}
            min={0}
            max={100}
            step={5}
            default={0}
            name={getLocalMessage('grayscale')}
            onChange={(value) => setConfig({grayscale: value})}
        />
    );

    const sepia = (
        <UpDown
            value={filterConfig.sepia}
            min={0}
            max={100}
            step={5}
            default={0}
            name={getLocalMessage('sepia')}
            onChange={(value) => setConfig({sepia: value})}
        />
    );

    return (
        <section class="filter-settings">
            <ModeToggle mode={filterConfig.mode} onChange={(mode) => setConfig({mode})} />
            {brightness}
            {contrast}
            {sepia}
            {grayscale}
            <CustomSettingsToggle data={data} tab={tab} actions={actions} />
        </section>
    );
}
