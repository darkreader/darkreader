import {html} from 'malevic';
import {MultiSwitch, Shortcut} from '../../../controls';
import ThemeEngines from '../../../../generators/theme-engines';
import {ExtWrapper} from '../../../../definitions';

const engineNames = [
    [ThemeEngines.cssFilter, 'Color filter'],
    [ThemeEngines.svgFilter, 'Filter+'],
    [ThemeEngines.staticTheme, 'Static theme'],
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
                    ? `switch theme engine: ${hotkey}`
                    : 'setup theme engine switch hotkey'
                )}
            />
        </div>
    );
}
