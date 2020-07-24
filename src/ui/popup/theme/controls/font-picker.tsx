import {m} from 'malevic';
import {Select} from '../../../controls';
import ThemeControl from './theme-control';
import {Theme} from '../../../../definitions';

interface FontPickerProps {
    theme: Theme;
    fonts: string[];
    onChange: (font: string) => void;
}

export default function FontPicker(props: FontPickerProps) {
    return (
        <ThemeControl label="Font">
            <Select
                class={props.theme.useFont ? null : 'font-picker--disabled'}
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
