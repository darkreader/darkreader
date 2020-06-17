import {m} from 'malevic';
import {DropDown} from '../../../controls';
import ThemeControl from './theme-control';

interface ColorSchemeDropDownProps {
    selected: string;
    values: string[];
    onChange: (value: string) => void;
}

export default function ColorSchemeDropDown(props: ColorSchemeDropDownProps) {
    return (
        <ThemeControl label="Color Scheme">
            <DropDown
                selected={props.selected}
                values={props.values}
                onChange={(v) => props.onChange(v)}
            />
        </ThemeControl>
    );
}
