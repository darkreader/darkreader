import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import {parseColorWithCache} from '../../../utils/color';
import TextBox from '../textbox';

import HSBPicker from './hsb-picker';

interface ColorPickerProps {
    class?: any;
    color: string;
    onChange: (color: string) => void;
    canReset: boolean;
    onReset: () => void;
}

interface ColorPickerStore {
    isFocused: boolean;
    textBoxNode: HTMLInputElement;
    previewNode: HTMLElement;
}

function isValidColor(color: string) {
    return Boolean(parseColorWithCache(color));
}

const colorPickerFocuses = new WeakMap<Node, () => void>();

function focusColorPicker(node: Node) {
    const focus = colorPickerFocuses.get(node)!;
    focus();
}

function ColorPicker(props: ColorPickerProps) {
    const context = getContext();
    context.onRender((node) => colorPickerFocuses.set(node, focus));
    const store: ColorPickerStore = context.store;

    const isColorValid = isValidColor(props.color);

    function onColorPreview(previewColor: string) {
        store.previewNode.style.backgroundColor = previewColor;
        store.textBoxNode.value = previewColor;
        store.textBoxNode.blur();
    }

    function onColorChange(rawValue: string) {
        const value = rawValue.trim();
        if (isValidColor(value)) {
            props.onChange(value);
        } else {
            props.onChange(props.color);
        }
    }

    function focus() {
        if (store.isFocused) {
            return;
        }
        store.isFocused = true;
        context.refresh();
        window.addEventListener('mousedown', onOuterClick, {passive: true});
    }

    function blur() {
        if (!store.isFocused) {
            return;
        }
        window.removeEventListener('mousedown', onOuterClick);
        store.isFocused = false;
        context.refresh();
    }

    function toggleFocus() {
        if (store.isFocused) {
            blur();
        } else {
            focus();
        }
    }

    function onOuterClick(e: MouseEvent) {
        if (!e.composedPath().some((el) => el === context.node)) {
            blur();
        }
    }

    const textBox = (
        <TextBox
            class="color-picker__input"
            onrender={(el) => {
                store.textBoxNode = el as HTMLInputElement;
                store.textBoxNode.value = isColorValid ? props.color : '';
            }}
            onkeypress={(e) => {
                const input = e.target as HTMLInputElement;
                if (e.key === 'Enter') {
                    const {value} = input;
                    onColorChange(value);
                    blur();
                    onColorPreview(value);
                }
            }}
            onfocus={focus}
        />
    );

    const previewElement = (
        <span
            class="color-picker__preview"
            onclick={toggleFocus}
            onrender={(el: HTMLElement) => {
                store.previewNode = el;
                el.style.backgroundColor = isColorValid ? props.color : 'transparent';
            }}
        ></span>
    );

    const resetButton = props.canReset ? (
        <span
            role="button"
            class="color-picker__reset"
            onclick={() => {
                props.onReset();
                blur();
            }}
        ></span>
    ) : null;

    const textBoxLine = (
        <span class="color-picker__textbox-line">
            {textBox}
            {previewElement}
            {resetButton}
        </span>
    );

    const hsbLine = isColorValid ? (
        <span class="color-picker__hsb-line">
            <HSBPicker
                color={props.color}
                onChange={onColorChange}
                onColorPreview={onColorPreview}
            />
        </span>
    ) : null;

    return (
        <span class={['color-picker', store.isFocused && 'color-picker--focused', props.class]}>
            <span class="color-picker__wrapper">
                {textBoxLine}
                {hsbLine}
            </span>
        </span>
    );
}

export default Object.assign(ColorPicker, {focus: focusColorPicker});
