import {m} from 'malevic';
import {MultiSwitch} from '../../../controls';
import ThemeEngines from '../../../../generators/theme-engines';
import {getLocalMessage} from '../../../../utils/locales';
import {isFirefox} from '../../../../utils/platform';

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

function openCSSEditor() {
    chrome.windows.create({
        type: 'panel',
        url: isFirefox ? '../stylesheet-editor/index.html' : 'ui/stylesheet-editor/index.html',
        width: 600,
        height: 600,
    });
}

export default function EngineSwitch({engine, onChange}: EngineSwitchProps) {
    return (
        <div class="engine-switch">
            <MultiSwitch
                value={engineNames.find(([code]) => code === engine)[1]}
                options={engineNames.map(([, name]) => name)}
                onChange={(value) => onChange(engineNames.find(([, name]) => name === value)[0])}
            />
            <span
                class={{
                    'engine-switch__css-edit-button': true,
                    'engine-switch__css-edit-button_active': engine === ThemeEngines.staticTheme,
                }}
                onclick={openCSSEditor}
            ></span>
            <label class="engine-switch__description">{getLocalMessage('theme_generation_mode')}</label>
        </div>
    );
}
