import {m} from 'malevic';
import {CheckBox, Select} from '../../../controls';
import ThemeControl from './theme-control';
import {Theme} from '../../../../definitions';

export default function FontPicker(props: {theme: Theme; fonts: string[]; onChange: (v: any) => void}) {
    return (
        <ThemeControl label='Font Picker'>
            <CheckBox
                checked={props.theme.useFont}
                onchange={props.onChange}
            />
            <Select
                value={props.theme.fontFamily}
                onChange={props.onChange}
                options={props.fonts.reduce((map, font) => {
                    map[font] = (
                        <div style={{'font-family': font}}>
                            {font}
                        </div>
                    );
                    return map;
                }, {} as {[font: string]: Malevic.Spec})}
            />
        </ThemeControl>
    );
}
