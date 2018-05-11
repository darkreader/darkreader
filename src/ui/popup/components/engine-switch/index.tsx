import {html} from 'malevic';
import {MultiSwitch, Shortcut} from '../../../controls';
import ThemeEngines from '../../../../generators/theme-engines';
import {getLocalMessage} from '../../../../utils/locales';
import {ExtensionData} from '../../../../definitions';

const engineNames = [
    [ThemeEngines.cssFilter, getLocalMessage('engine_filter')],
    [ThemeEngines.svgFilter, getLocalMessage('engine_filter_plus')],
    [ThemeEngines.staticTheme, getLocalMessage('engine_static')],
    [ThemeEngines.dynamicTheme, getLocalMessage('engine_dynamic')],
];

interface EngineSwitchProps {
    engine: string;
    onChange: (engine: string) => void;
}

export default function EngineSwitch({engine, onChange}: EngineSwitchProps) {
    return (
        <div class="engine-switch">
            <MultiSwitch
                value={engineNames.find(([code, name]) => code === engine)[1]}
                options={engineNames.map(([code, name]) => name)}
                onChange={(value) => onChange(engineNames.find(([code, name]) => name === value)[0])}
            />
            <label class="engine-switch__description">{getLocalMessage('theme_generation_mode')}</label>
        </div>
    );
}
