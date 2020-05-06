import {m} from 'malevic';
import TextBox from '../textbox';

interface ColorPickerProps {
    class?: any;
    color: string;
    onChange: (color: string) => void;
    onReset: () => void;
}

const DEFAULT_COLOR = '#000000';
const hex6ColorMatch = /^#[0-9a-f]{6}$/i;

function isValidColor(color: string) {
    return color && hex6ColorMatch.test(color);
}

// TODO: Add a HSB color picker.
export default function ColorPicker(props: ColorPickerProps) {
    const previewColor = isValidColor(props.color) ? props.color : DEFAULT_COLOR;

    function onColorChange(rawValue: string) {
        const value = rawValue.trim();
        if (isValidColor(value)) {
            props.onChange(value);
        } else {
            props.onChange(props.color);
        }
    }

    return (
        <span class={['color-picker', props.class]}>
            <TextBox
                class="color-picker__input"
                value={previewColor}
                onchange={(e) => onColorChange(e.target.value)}
                onkeypress={(e) => {
                    const input = e.target as HTMLInputElement;
                    if (e.key === 'Enter') {
                        input.blur();
                        onColorChange(input.value);
                    }
                }}
            />
            <span
                class="color-picker__preview"
                style={{'background-color': previewColor}}
            ></span>
            <span
                role="button"
                class="color-picker__reset"
                onclick={props.onReset}
            ></span>
        </span>
    );
}
