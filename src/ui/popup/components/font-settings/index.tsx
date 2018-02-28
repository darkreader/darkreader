import {html} from 'malevic';
import {CheckBox, UpDown, Select} from '../../../controls';
import {Extension} from '../../../../definitions';

export default function FontSettings({ext}: {ext: Extension}) {
    return (
        <section class="font-settings">
            <div class="font-settings__font-select-container">
                <div class="font-settings__font-select-container__line">
                    <CheckBox
                        checked={ext.config.useFont}
                        onchange={(e) => ext.setConfig({useFont: e.target.checked})}
                    />
                    <Select
                        value={ext.config.fontFamily}
                        onChange={(value) => ext.setConfig({fontFamily: value})}
                        options={ext.fonts.reduce((map, font) => {
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
                value={ext.config.textStroke}
                min={0}
                max={1}
                step={0.1}
                default={0}
                name="Text stroke"
                onChange={(value) => ext.setConfig({textStroke: value})}
            />
        </section>
    );
}
