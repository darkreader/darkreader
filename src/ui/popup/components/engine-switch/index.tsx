import {html} from 'malevic';
import {MultiSwitch, Shortcut} from '../../../controls';
import ThemeEngines from '../../../../generators/theme-engines';
import {ExtensionData} from '../../../../definitions';

const engineNames = [
    [ThemeEngines.cssFilter, 'Filter'],
    [ThemeEngines.svgFilter, 'Filter+'],
    [ThemeEngines.staticTheme, 'Static'],
    [ThemeEngines.dynamicTheme, 'Dynamic'],
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
            <label class="engine-switch__description">Theme generation mode</label>
        </div>
    );
}
