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
    const store = context.store as {isFocused: boolean};

    const previewColor = isValidColor(props.color) ? props.color : FALLBACK_COLOR;

    function onColorChange(rawValue: string) {
        const value = rawValue.trim();
        if (isValidColor(value)) {
            props.onChange(value);
        } else {
            props.onChange(props.color);
        }
    }

    function onOuterClick(e: MouseEvent) {
        if (!e.composedPath().some((el) => el === context.node)) {
            window.removeEventListener('mousedown', onOuterClick);
            store.isFocused = false;
            context.refresh();
        }
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
                        store.isFocused = false;
                        onColorChange(input.value);
                    }
                }}
                onfocus={() => {
                    store.isFocused = true;
                    context.refresh();
                    window.addEventListener('mousedown', onOuterClick);
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

    const hsbLine = (
        <span class="color-picker__hsb-line">
            <HSBPicker
                color={previewColor}
                onChange={onColorChange}
            />
        </span>
    );

    return (
        <span class={['color-picker', store.isFocused && 'color-picker--focused', props.class]}>
            <span class="color-picker__wrapper">
                {textBoxLine}
                {hsbLine}
            </span>
        </span>
    );
}
