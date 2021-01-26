import {m} from 'malevic';
import {UpDown} from '../../../controls';
import CustomSettingsToggle from '../custom-settings-toggle';
import ModeToggle from './mode-toggle';
import {getLocalMessage} from '../../../../utils/locales';
import {isURLInList} from '../../../../utils/url';
import type {ExtWrapper, TabInfo, Theme} from '../../../../definitions';

export default function ThemeSettings({data, actions, tab}: ExtWrapper & {tab: TabInfo}) {

    const custom = data.settings.customThemes.find(({url}) => isURLInList(tab.url, url));
    const theme = custom ? custom.theme : data.settings.theme;

    function setTheme(theme: Partial<Theme>) {
        if (custom) {
            custom.theme = {...custom.theme, ...theme};
            actions.changeSettings({customThemes: data.settings.customThemes});
        } else {
            actions.setTheme(theme);
        }
    }

    const brightness = (
        <UpDown
            value={theme.brightness}
            min={50}
            max={150}
            step={5}
            default={100}
            name={getLocalMessage('brightness')}
            onChange={(value) => setTheme({brightness: value})}
        />
    );

    const contrast = (
        <UpDown
            value={theme.contrast}
            min={50}
            max={150}
            step={5}
            default={100}
            name={getLocalMessage('contrast')}
            onChange={(value) => setTheme({contrast: value})}
        />
    );

    const grayscale = (
        <UpDown
            value={theme.grayscale}
            min={0}
            max={100}
            step={5}
            default={0}
            name={getLocalMessage('grayscale')}
            onChange={(value) => setTheme({grayscale: value})}
        />
    );

    const sepia = (
        <UpDown
            value={theme.sepia}
            min={0}
            max={100}
            step={5}
            default={0}
            name={getLocalMessage('sepia')}
            onChange={(value) => setTheme({sepia: value})}
        />
    );

    return (
        <section class="theme-settings">
            <ModeToggle mode={theme.mode} onChange={(mode) => setTheme({mode})} />
            {brightness}
            {contrast}
            {sepia}
            {grayscale}
            <CustomSettingsToggle data={data} tab={tab} actions={actions} />
        </section>
    );
}
