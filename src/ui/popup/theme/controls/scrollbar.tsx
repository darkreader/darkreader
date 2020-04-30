import {m} from 'malevic';
import ThemeControl from './theme-control';
import {ColorDropDown} from '../../../controls';

export default function Scrollbar(props: {selected: string; hexColor: string; onChange: (option: string) => void; onColorChange: (option: string) => void}) {
    return (
        <ThemeControl label="Scrollbar">
            <ColorDropDown
                hexColor={props.hexColor}
                selected={props.selected}
                onChange={(v) => props.onChange(v)}
                onColorChange={(v) => props.onColorChange(v)}
            />
        </ThemeControl>
    );
}
