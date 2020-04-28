import {m} from 'malevic';
import ThemeControl from './theme-control';
import {Color_DropDown} from '../../../controls';

export default function Scrollbar(props: {selected: string; hexColor: string; onChange: (option: string) => void}) {
    return (
        <ThemeControl label="Scheme">
            <Color_DropDown
                hexColor={props.hexColor}
                selected={props.selected}
                onChange={(v) => props.onChange(v)}
            />
        </ThemeControl>
    );
}
