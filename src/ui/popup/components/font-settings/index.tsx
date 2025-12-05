import {m} from 'malevic';

import type {Theme} from '../../../../definitions';
import {getLocalMessage} from '../../../../utils/locales';
import {CheckBox, UpDown, Select} from '../../../controls';

interface FontSettingsProps {
    config: Theme;
    fonts: string[];
    onChange: (config: Partial<Theme>) => void;
}

export default function FontSettings({config, fonts, onChange}: FontSettingsProps) {
    return (
        <section class="font-settings">
            <div class="font-settings__font-select-container">
                <div class="font-settings__font-select-container__line">
                    <CheckBox
                        checked={config.useFont}
                        onchange={(e: {target: HTMLInputElement}) => onChange({useFont: e.target.checked})}
                    />
                    <Select
                        value={config.fontFamily}
                        onChange={(value) =>
                            onChange({
                                fontFamily: value,
                                useFont: true,
                            })
                        }
                        options={fonts.reduce((map, font) => {
                            map[font] = (
                                <div style={{'font-family': font}}>
                                    {font}
                                </div>
                            );
                            return map;
                        }, {} as {[font: string]: Malevic.Spec})}
                    />
                </div>
                <label class="font-settings__font-select-container__label">
                    {getLocalMessage('select_font')}
                </label>
            </div>
            <UpDown
                value={config.textStroke}
                min={0}
                max={1}
                step={0.1}
                default={0}
                name={getLocalMessage('text_stroke')}
                onChange={(value) => onChange({textStroke: value})}
            />
        </section>
    );
}
