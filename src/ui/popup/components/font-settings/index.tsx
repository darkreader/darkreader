import {html} from 'malevic';
import {CheckBox, UpDown, Select} from '../../../controls';
import {ExtWrapper} from '../../../../definitions';

export default function FontSettings({data, actions}: ExtWrapper) {
    return (
        <section class="font-settings">
            <div class="font-settings__font-select-container">
                <div class="font-settings__font-select-container__line">
                    <CheckBox
                        checked={data.filterConfig.useFont}
                        onchange={(e) => actions.setConfig({useFont: e.target.checked})}
                    />
                    <Select
                        value={data.filterConfig.fontFamily}
                        onChange={(value) => actions.setConfig({fontFamily: value})}
                        options={data.fonts.reduce((map, font) => {
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
                value={data.filterConfig.textStroke}
                min={0}
                max={1}
                step={0.1}
                default={0}
                name="Text stroke"
                onChange={(value) => actions.setConfig({textStroke: value})}
            />
        </section>
    );
}
