import {m} from 'malevic';

import {DropDown} from '../../../controls';

import ThemeControl from './theme-control';

interface ColorSchemeDropDownProps {
    selected: string;
    values: Array<{id: string; content: string}>;
    onChange: (value: string) => void;
}

export default function ColorSchemeDropDown(props: ColorSchemeDropDownProps) {
    function onColorSchemeChange(value: string) {
        props.onChange(value);
    }

    return (
        <ThemeControl label="Color Scheme">
            <DropDown
                selected={props.selected}
                options={props.values}
                onChange={onColorSchemeChange}
            />
        </ThemeControl>
    );
}
