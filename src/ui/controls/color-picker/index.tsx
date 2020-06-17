import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {parse} from '../../../utils/color';
import TextBox from '../textbox';
import HSBPicker from './hsb-picker';

interface ColorPickerProps {
    class?: any;
    color: string;
    onChange: (color: string) => void;
    onReset: () => void;
}

const FALLBACK_COLOR = '#000000';

function isValidColor(color: string) {
    try {
        parse(color);
        return true;
    } catch (err) {
        return false;
    }
}

export default function ColorPicker(props: ColorPickerProps) {
    const context = getContext();
    const store = context.store as {isHSBVisible: boolean};

    const previewColor = isValidColor(props.color) ? props.color : FALLBACK_COLOR;

    function onColorChange(rawValue: string) {
        const value = rawValue.trim();
        if (isValidColor(value)) {
            props.onChange(value);
        } else {
            props.onChange(props.color);
        }
    }

    function onTextBoxClick() {
        store.isHSBVisible = true;
        context.refresh();
    }

    const textBoxLine = (
        <span class="color-picker__textbox-line">
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
                onclick={onTextBoxClick}
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

    const hsbLine = (
        <span class="color-picker__hsb-line">
            <HSBPicker
                color={previewColor}
                onChange={onColorChange}
            />
        </span>
    );

    return (
        <label class={['color-picker', props.class]}>
            <span class="color-picker__wrapper">
                {textBoxLine}
                {hsbLine}
            </span>
        </label>
    );
}
