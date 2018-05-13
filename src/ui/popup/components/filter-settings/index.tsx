import {html} from 'malevic';
import {UpDown, Button} from '../../../controls';
import CustomSettingsToggle from '../custom-settings-toggle';
import EngineSwitch from '../engine-switch';
import ModeToggle from './mode-toggle';
import {getLocalMessage} from '../../../../utils/locales';
import {isURLInList} from '../../../../utils/url';
import {ExtWrapper, TabInfo, FilterConfig} from '../../../../definitions';

export default function FilterSettings({data, actions, tab}: ExtWrapper & {tab: TabInfo}) {

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

    const brightness = (
        <UpDown
            value={filterConfig.brightness}
            min={50}
            max={150}
            step={10}
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
            step={10}
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
            step={10}
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
            step={10}
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
