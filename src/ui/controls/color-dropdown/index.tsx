import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import {parseColorWithCache} from '../../../utils/color';
import ColorPicker from '../color-picker';
import DropDown from '../dropdown';

interface ColorDropDownProps {
    class?: string;
    value: string;
    colorSuggestion: string;
    hasDefaultOption?: boolean;
    hasAutoOption?: boolean;
    onChange: (value: string) => void;
    onReset: () => void;
}

interface ColorDropDownStore {
    isOpen: boolean;
    listNode: HTMLElement;
    selectedNode: HTMLElement;
}

export default function ColorDropDown(props: ColorDropDownProps) {
    const context = getContext();
    const store: ColorDropDownStore = context.store;

    const labels = {
        DEFAULT: 'Default',
        AUTO: 'Auto',
        CUSTOM: 'Custom',
    };

    const dropDownOptions = [
        props.hasDefaultOption ? {id: 'default', content: labels.DEFAULT} : null,
        props.hasAutoOption ? {id: 'auto', content: labels.AUTO} : null,
        {id: 'custom', content: labels.CUSTOM},
    ].filter((v) => v) as Array<{id: string; content: string}>;

    const selectedDropDownValue = (
        props.value === '' ? 'default' :
            props.value === 'auto' ? 'auto' :
                'custom'
    );

    function onDropDownChange(value: 'default' | 'auto' | 'custom') {
        const result = {
            default: '',
            auto: 'auto',
            custom: props.colorSuggestion,
        }[value];
        props.onChange(result);
    }

    const isPickerVisible = Boolean(parseColorWithCache(props.value));

    const prevValue = context.prev ? context.prev.props.value : null;
    const shouldFocusOnPicker = (
        (props.value !== '' && props.value !== 'auto') &&
        prevValue != null &&
        (prevValue === '' || prevValue === 'auto')
    );

    function onRootRender(root: Element) {
        if (shouldFocusOnPicker) {
            const pickerNode = root.querySelector('.color-dropdown__picker')!;
            ColorPicker.focus(pickerNode);
        }
    }

    return (
        <span
            class={{
                'color-dropdown': true,
                'color-dropdown--open': store.isOpen,
                [props.class!]: Boolean(props.class),
            }}
            onrender={onRootRender}
        >
            <DropDown class="color-dropdown__options"
                options={dropDownOptions}
                selected={selectedDropDownValue}
                onChange={onDropDownChange}
            />
            <ColorPicker
                class={{
                    'color-dropdown__picker': true,
                    'color-dropdown__picker--hidden': !isPickerVisible,
                }}
                color={props.value}
                onChange={props.onChange}
                canReset={true}
                onReset={props.onReset}
            />
        </span>
    );
}
