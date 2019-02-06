import {html} from 'malevic';

import {CheckBox, UpDown, Toggle, Select, CustToggle} from '../../../controls';

import {getLocalMessage} from '../../../../utils/locales';
import {FilterConfig} from '../../../../definitions';


//most of this taken from fontsettings

interface FontSettingsProps {
    config: FilterConfig;
    fonts: string[];
    onChange: (config: Partial<FilterConfig>) => void;
}



const myObj = [{"id":"Red/Green","text":"Red/Green"},{"id":"Yellow/Blue","text":"Yellow/Blue"}, {"id":"Mono","text":"Mono"}];

const selectedIds = myObj.map(({ id }) => id);

export default function CBSettings({config, fonts, onChange}: FontSettingsProps) {
    return (
        <section class="font-settings">
            <div class="font-settings__font-select-container">
                <div class="font-settings__font-select-container__line">
                    <CheckBox
                        checked={config.useFont}
                        //onchange={(e) => onChange({useFont: e.target.checked})}
                    />
                    <Select
                        value={"Red/Green"}
                        //onChange={(value) => onChange({fontFamily: value})}
                        options={selectedIds}
                    />
                    
                </div>
                <label class="font-settings__font-select-container__label">
                    {getLocalMessage('select_type_of_cb')}
                </label>
            </div>
            <UpDown
                value={config.dummy_val}
                min={0}
                max={1}
                step={0.1}
                default={0}
                name={getLocalMessage('sensitivity')}
                onChange={(value) => onChange({dummy_val: value})}
                //onChange={(value) =>0}
            />
            

            <div style="width:182px;">
                <div style="width:33px; float:left;">
                    <input class="jscolor jscolor-active" value={config.unclickedColor} name="unclicked" onchange={(value) => onChange({unclickedColor: value.target.value})} />
                    <label class="font-settings__font-select-container__label">
                        {getLocalMessage('unvisited_link')}
                    </label>
                </div>
                <div style="width:63px; float:right;">
                    <input class="jscolor jscolor-active" value={config.clickedColor} name="clicked" onchange={(value) => onChange({clickedColor: value.target.value})}/>
                    <label class="font-settings__font-select-container__label">
                        {getLocalMessage('visited_link')}
                    </label>
                </div>
            </div>
            <script>window.jscolor.installByClassName("jscolor")</script> 

            <CustToggle

                //class="site-list-settings__toggle"
                checked={true}
                labelOn={getLocalMessage('enable_color_hover')}
                labelOff={getLocalMessage('disable_color_hover')}
                onChange={(value) => 0}
                //onChange = {printName}
            />
            
        </section>
        
    );
}
