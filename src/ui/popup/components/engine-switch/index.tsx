import {m} from 'malevic';
import {MultiSwitch} from '../../../controls';
import {ThemeEngine} from '../../../../generators/theme-engines';
import {getLocalMessage} from '../../../../utils/locales';
import {isFirefox} from '../../../../utils/platform';

const engineNames: Array<[ThemeEngine, string]> = [
    [ThemeEngine.cssFilter, getLocalMessage('engine_filter')],
    [ThemeEngine.svgFilter, getLocalMessage('engine_filter_plus')],
    [ThemeEngine.staticTheme, getLocalMessage('engine_static')],
    [ThemeEngine.dynamicTheme, getLocalMessage('engine_dynamic')],
];

interface EngineSwitchProps {
    engine: ThemeEngine;
    onChange: (engine: ThemeEngine) => void;
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
                    'engine-switch__css-edit-button_active': engine === ThemeEngine.staticTheme,
                }}
                onclick={openCSSEditor}
            ></span>
            <label class="engine-switch__description">{getLocalMessage('theme_generation_mode')}</label>
        </div>
    );
}
