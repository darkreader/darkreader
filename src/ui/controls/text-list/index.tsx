import {html, getData} from 'malevic';
import TextBox from '../textbox';
import VirtualScroll from '../virtual-scroll';

interface TextListProps {
    values: string[];
    placeholder: string;
    isFocused?: boolean;
    class?: string;
    onChange: (values: string[]) => void;
}

const propsStore = new WeakMap<Element, TextListProps>();

export default function TextList(props: TextListProps) {
    function onTextChange(e) {
        const index = getData(e.target);
        const values = props.values.slice();
        const value = e.target.value.trim();
        if (values.indexOf(value) >= 0) {
            return;
        }

        if (!value) {
            values.splice(index, 1);
        } else if (index === values.length) {
            values.push(value);
        } else {
            values.splice(index, 1, value);
        }

        props.onChange(values);
    }

    function createTextBox(text: string, index: number) {
        return (
            <TextBox
                class="text-list__textbox"
                value={text}
                data={index}
                placeholder={props.placeholder}
            />
        );
    }

    return (node: HTMLElement) => {
        let shouldFocus = false;

        const prevProps = propsStore.get(node);
        propsStore.set(node, props);
        if (props.isFocused && (
            !prevProps ||
            !prevProps.isFocused ||
            prevProps.values.length < props.values.length
        )) {
            shouldFocus = true;
            requestAnimationFrame(() => {
                const inputs = node.querySelectorAll('.text-list__textbox');
                const last = inputs.item(inputs.length - 1) as HTMLInputElement;
                last.focus();
            });
        }

        return (
            <VirtualScroll
                root={<div class={['text-list', props.class]} onchange={onTextChange} />}
                items={props.values
                    .map(createTextBox)
                    .concat(createTextBox('', props.values.length))}
                scrollToIndex={shouldFocus ? props.values.length : -1}
            />
        )
    };
}
