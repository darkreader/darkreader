import {m} from 'malevic';

import {ThemeEngine} from '../../../../generators/theme-engines';
import {getLocalMessage} from '../../../../utils/locales';
import {MultiSwitch} from '../../../controls';
import {openExtensionPage} from '../../../utils';

const engineNames: Array<[ThemeEngine, string]> = [
    [ThemeEngine.dynamicTheme, getLocalMessage('engine_dynamic')],
    [ThemeEngine.cssFilter, getLocalMessage('engine_filter')],
    [ThemeEngine.svgFilter, getLocalMessage('engine_filter_plus')],
    [ThemeEngine.staticTheme, getLocalMessage('engine_static')],
];

interface EngineSwitchProps {
    engine: ThemeEngine;
    onChange: (engine: ThemeEngine) => void;
}

function openCSSEditor() {
    openExtensionPage('stylesheet-editor');
}

export default function EngineSwitch({engine, onChange}: EngineSwitchProps) {
    return (
        <div class="engine-switch">
            <MultiSwitch
                value={engineNames.find(([code]) => code === engine)![1]}
                options={engineNames.map(([, name]) => name)}
                onChange={(value) => onChange(engineNames.find(([, name]) => name === value)![0])}
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
