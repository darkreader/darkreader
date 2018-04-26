import {html} from 'malevic';
import {MultiSwitch, Shortcut} from '../../../controls';
import ThemeEngines from '../../../../generators/theme-engines';
import {getLocalMessage} from '../../../../utils/locales';
import {ExtWrapper} from '../../../../definitions';

const engineNames = [
    [ThemeEngines.cssFilter, getLocalMessage('engine_filter')],
    [ThemeEngines.svgFilter, getLocalMessage('engine_filter_plus')],
    [ThemeEngines.staticTheme, getLocalMessage('engine_static')],
    [ThemeEngines.dynamicTheme, getLocalMessage('engine_dynamic')],
];

export default function EngineSwitch({data, actions}: ExtWrapper) {
    return (
        <div class="engine-switch">
            <MultiSwitch
                value={engineNames.find(([code, name]) => code === data.filterConfig.engine)[1]}
                options={engineNames.map(([code, name]) => name)}
                onChange={(value) => actions.setConfig({engine: engineNames.find(([code, name]) => name === value)[0]})}
            />
            <Shortcut
                commandName="switchEngine"
                shortcuts={data.shortcuts}
                textTemplate={(hotkey) => (hotkey
                    ? `${getLocalMessage('switch_theme_engine')}: ${hotkey}`
                    : getLocalMessage('setup_hotkey_switch_theme_engine')
                )}
                onSetShortcut={(shortcut) => actions.setShortcut('switchEngine', shortcut)}
            />
        </div>
    );
}
