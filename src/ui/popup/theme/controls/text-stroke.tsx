import {m} from 'malevic';

import {Slider} from '../../../controls';

import ThemeControl from './theme-control';

export default function TextStroke(props: {value: number; onChange: (v: number) => void}) {
    return (
        <ThemeControl label="Text stroke">
            <Slider
                value={props.value}
                min={0}
                max={1}
                step={0.1}
                formatValue={String}
                onChange={props.onChange}
            />
        </ThemeControl>
    );
}
