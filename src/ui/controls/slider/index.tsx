import {html} from 'malevic';

interface SliderProps {
    min: number;
    max: number;
    step: number;
    value: number;
    label: string;
    oninput: (slider: HTMLElement, sliderValue: number) => void;
    onchange: (slider: HTMLElement, sliderValue: number) => void;
}

export default function Slider(props: SliderProps) {
    return (
        <div class="slidecontainer">
            <input type="range" class="slider-square" 
                min={props.min} max={props.max} step={props.step} value={props.value}
                oninput={(e) => props.oninput(e.target.parentElement, parseFloat(e.target.value))}
                onchange={(e) => props.onchange(e.target.parentElement, parseFloat(e.target.value))}
            />
            <div class="slider-square__label">
                {props.label}
            </div>
        </div>
    );
}
