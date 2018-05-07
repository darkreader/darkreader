import {html} from 'malevic';
import {CheckBox, UpDown, Select} from '../../../controls';
import {FilterConfig} from '../../../../definitions';

interface FontSettingsProps {
    config: FilterConfig;
    fonts: string[];
    onChange: (config: FilterConfig) => void;
}

export default function FontSettings({config, fonts, onChange}: FontSettingsProps) {
    return (
        <section class="font-settings">
            <div class="font-settings__font-select-container">
                <div class="font-settings__font-select-container__line">
                    <CheckBox
                        checked={config.useFont}
                        onchange={(e) => onChange({useFont: e.target.checked})}
                    />
                    <Select
                        value={config.fontFamily}
                        onChange={(value) => onChange({fontFamily: value})}
                        options={fonts.reduce((map, font) => {
                            map[font] = (
                                <div style={{'font-family': font}}>
                                    {font}
                                </div>
                            );
                            return map;
                        }, {} as {[font: string]: Malevic.NodeDeclaration;})}
                    />
                </div>
                <label class="font-settings__font-select-container__label">
                    Select a font
                </label>
            </div>
            <UpDown
                value={config.textStroke}
                min={0}
                max={1}
                step={0.1}
                default={0}
                name="Text stroke"
                onChange={(value) => onChange({textStroke: value})}
            />
        </section>
    );
}
