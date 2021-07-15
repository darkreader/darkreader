import {m} from 'malevic';
import {Slider} from '../../../controls';
import ThemeControl from './theme-control';

export default function MaxImagePerSecond(props: {value: number; onChange: (v: number) => void}) {
    return (
        <ThemeControl label={'The amount of images that can be analyzed per second. Lower = more performance.'}>
            <Slider
                value={props.value}
                min={0}
                max={100}
                step={5}
                formatValue={String}
                onChange={props.onChange}
            />
        </ThemeControl>
    );
}
