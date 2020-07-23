import {m} from 'malevic';
import {Slider} from '../../../controls';
import ThemeControl from './theme-control';

export default function TextStroke(props: {value: number; onChange: (v: any) => void}) {
    return (
        <ThemeControl label='Text Stroke'>
            <Slider
                value={props.value}
                min={0}
                max={1}
                step={0.1}
                formatValue={(e) => { return e.toString(); }}
                onChange={props.onChange}
            />
        </ThemeControl>
    );
}
