import {html} from 'malevic';

interface TrackProps {
    value: number;
    label: string;
}

export default function Track(props: TrackProps) {
    const valueStyle = {'width': `${props.value * 100}%`};

    return (
        <span class="track">
            <span class="track__value" style={valueStyle}></span>
            <label class="track__label">
                {props.label}
            </label>
        </span >
    );
}
