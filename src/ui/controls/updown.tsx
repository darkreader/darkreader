import { html } from 'malevic';
import Col from './col';
import Row from './row';
import Button from './button';

interface UpDownProps {
    value: number;
    min: number;
    max: number;
    step: number;
    default: number;
    name: string;
    onChange: (value: number) => void;
}

function TrackBar(props: { value: number; label: string; }) {

    const valueStyle = { 'width': `${props.value * 100}%` };

    return (
        <span class="track-bar">
            <span class="track-bar__value" style={valueStyle}>&nbsp;</span>
            <label class="track-bar__label">
                {props.label}
            </label>
        </span >
    );
}

export default function UpDown(props: UpDownProps) {

    const buttonDownCls = {
        'updown__button': true,
        'updown__button--disabled': props.value === props.min
    };

    const buttonUpCls = {
        'updown__button': true,
        'updown__button--disabled': props.value === props.max
    };

    function normalize(x: number) {
        return Math.max(props.min, Math.min(props.max, Math.round(x / props.step) * props.step));
    }

    function onButtonDownClick() {
        props.onChange(normalize(props.value - props.step));
    }

    function onButtonUpClick() {
        props.onChange(normalize(props.value + props.step));
    }

    const trackValue = (props.value - props.min) / (props.max - props.min);
    const valueText = (props.value === props.default
        ? 'off'
        : props.value > props.default
            ? `+${props.value - props.default}`
            : `-${props.default - props.value}`
    );

    return (
        <Col class="updown">
            <Row class="updown__line">
                <Button class={buttonDownCls} onclick={onButtonDownClick} >
                    <span class="updown__icon-down"></span>
                </Button>
                <TrackBar
                    value={trackValue}
                    label={props.name}
                />
                <Button class={buttonUpCls} onclick={onButtonUpClick} >
                    <span class="updown__icon-up"></span>
                </Button>
            </Row>
            <label class="updown__value-text">
                {valueText}
            </label>
        </Col>
    );
}
