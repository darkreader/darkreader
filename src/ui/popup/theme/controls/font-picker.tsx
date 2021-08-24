import {m} from 'malevic';
import {Select} from '../../../controls';
import ThemeControl from './theme-control';
import type {Theme} from '../../../../definitions';

interface FontPickerProps {
    theme: Theme;
    fonts: string[];
    onChange: (font: string) => void;
}

export default function FontPicker(props: FontPickerProps) {
    return (
        <ThemeControl label="Font name">
            <Select
                class={{
                    'font-picker': true,
                    'font-picker--disabled': !props.theme.useFont,
                }}
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
