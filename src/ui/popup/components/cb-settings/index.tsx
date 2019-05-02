import {html} from 'malevic';
import {CheckBox, UpDown, Toggle, Select, CustToggle, Button} from '../../../controls';
import {getLocalMessage} from '../../../../utils/locales';
import {FilterConfig} from '../../../../definitions';
import {hoverFunVer2} from '../cb-settings/hoverFunctions'
import {ColorblindnessType, ColorCorrectionType} from '../../../../generators/css-filter'


//most of this taken from fontsettings

interface CbSettingsProps {
    config: FilterConfig;
    fonts: string[];
    onChange: (config: Partial<FilterConfig>) => void;
}

const colorblindnessTypes = [
    { 
        "id": ColorblindnessType.deuteranopia, 
        "text": "Deuteranopia", // (Red/Green - poor Green)",
        "corrections": [
            ColorCorrectionType.lmsDaltonization,
            ColorCorrectionType.lab
        ] 
    },
    {
        "id": ColorblindnessType.protanopia, 
        "text": "Protanopia", // (Red/Green - poor Red)",
        "corrections": [
            ColorCorrectionType.lmsDaltonization,
            ColorCorrectionType.cbFilterService
        ] 
    },
    { 
        "id": ColorblindnessType.tritanopia, 
        "text": "Tritanopia", // (Yellow/Blue)",
        "corrections": [
            ColorCorrectionType.lmsDaltonization,
            ColorCorrectionType.shift
        ]
    }
];

const colorCorrectionTypes = [
    { "id": ColorCorrectionType.lmsDaltonization, "text": "LMS Daltonization" },
    { "id": ColorCorrectionType.cbFilterService, "text": "CBFS Method" },
    { "id": ColorCorrectionType.lab, "text": "LAB Method" },
    { "id": ColorCorrectionType.shift, "text": "Shifting Method" }
];

export default function CBSettings({config, fonts, onChange}: CbSettingsProps) {
    return (
        <section class="cb-settings">
            <div class="cb-settings__cb-select-container">
                <label class="cb-settings__cb-select-container__label">
                    {getLocalMessage('enable_cb')}
                </label>
                <div class="cb-settings__cb-select-container cb-settings__cb-select-container__stack">
                    <div class="cb-settings__cb-select-container">
                        <div class="cb-settings__cb-select-container__line">
                            <CheckBox
                                checked={config.useColorCorrection}
                                onchange={(e) => onChange({useColorCorrection: e.target.checked})}
                            />
                            <Select
                                value={colorblindnessTypes.find(x => x.id == config.colorblindnessType).text}
                                onChange={(value) => onChange({colorblindnessType: value})}
                                options={colorblindnessTypes.reduce((map, x) => {
                                    map[x.id] = (
                                        <div>
                                            {x.text}
                                        </div>
                                    );
                                    return map;
                                }, {} as {[text: string]: Malevic.NodeDeclaration;})}
                            />
                        </div>
                    </div>
                    <div class="cb-settings__cb-select-container">
                        <Select
                            value={colorCorrectionTypes.find(x => x.id == config.colorCorrectionType).text}
                            onChange={(value) => onChange({colorCorrectionType: value})}
                            options={colorCorrectionTypes.reduce((map, x) => {
                                map[x.id] = (
                                    <div>
                                        {x.text}
                                    </div>
                                );
                                return map;
                            }, {} as {[text: string]: Malevic.NodeDeclaration;})}
                        />
                        <label class="cb-settings__cb-select-container__label">
                            {getLocalMessage('select_type_of_cb_correction')}
                        </label>
                    </div>
                </div>
                <div class="cb-settings__cb-select-container__line">
                    <UpDown
                        value={config.colorblindnessSensitivity * 100}
                        min={0}
                        max={100}
                        step={10}
                        default={0}
                        name={getLocalMessage('sensitivity')}
                        onChange={(value) => onChange({colorblindnessSensitivity: value / 100})}
                    />
                    <div class="cb-settings__cb-select-container" style="width: 30%;">
                        <Button onclick={() => window.open('http://www.mscs.mu.edu/~cmorley/paint.html', '_blank')}>
                            {getLocalMessage('calibrate_colorblindness')}
                        </Button>
                    </div>
                </div>
            </div>
            <div class="cb-settings__cb-select-container">
                <div style="display:flex; justify-content:space-evenly; width:97%; text-align:center;">
                    <div class="cb-settings__cb-select-container">
                        <input class="jscolor jscolor-active" style="width:80px" value={config.unclickedColor} name="unclicked" onchange={(value) => onChange({unclickedColor: value.target.value})} />
                        <label class="cb-settings__cb-select-container__label">
                            {getLocalMessage('unvisited_link')}
                        </label>
                    </div>
                    <CheckBox
                        checked={config.linkColor}
                        onchange={(e) => onChange({linkColor: e.target.checked})}
                    />
                    <div class="cb-settings__cb-select-container">
                        <input class="jscolor jscolor-active" style="width:80px" value={config.clickedColor} name="clicked" onchange={(value) => onChange({clickedColor: value.target.value})}/>
                        <label class="cb-settings__cb-select-container__label">
                            {getLocalMessage('visited_link')}
                        </label>
                    </div>
                </div>
            </div>
            <script>window.jscolor.installByClassName("jscolor")</script> 

            <div class="cb-settings__cb-select-container cb-settings__cb-select-container__stack">
                <Button
                    onclick={() => hoverFunVer2()}
                >
                    BETA HOVER
                </Button>
                
            </div>

        </section>
        
    );
}

//<button id = "hoverButton" onClick = "hoverFun()">HOVER</button>
//<input type="button" value="Click" onClick = "console.log('test')"></input>