import {m} from 'malevic';

import {getLocalMessage} from '../../../utils/locales';

import Track from './track';

interface UpDownProps {
    value: number;
    min: number;
    max: number;
    step: number;
    default: number;
    name: string;
    onChange: (value: number) => void;
}

export default function UpDown(props: UpDownProps) {
    function normalize(x: number) {
        const s = Math.round(x / props.step) * props.step;
        const exp = Math.floor(Math.log10(props.step));
        if (exp >= 0) {
            const m = 10 ** exp;
            return Math.round(s / m) * m;
        }
        const m = 10 ** -exp;
        return Math.round(s * m) / m;
    }

    function clamp(x: number) {
        return Math.max(props.min, Math.min(props.max, x));
    }

    function onTrackValueChange(trackValue: number) {
        props.onChange(clamp(normalize(trackValue * (props.max - props.min) + props.min)));
    }

    const trackValue = (props.value - props.min) / (props.max - props.min);
    const valueText = (props.value === props.default
        ? getLocalMessage('off').toLocaleLowerCase()
        : props.value > props.default
            ? `+${normalize(props.value - props.default)}`
            : `-${normalize(props.default - props.value)}`
    );

    return (
        <div class="updown">
            <div class="updown__line">
                <Track
                    value={trackValue}
                    label={props.name}
                    onChange={onTrackValueChange}
                />
            </div>
            <label class="updown__value-text">
                {valueText}
            </label>
        </div>
    );
}
