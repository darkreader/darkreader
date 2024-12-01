import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import TextBox from '../textbox';
import VirtualScroll from '../virtual-scroll';

interface TextListProps {
    values: string[];
    placeholder: string;
    isFocused?: boolean;
    class?: string;
    onChange: (values: string[]) => void;
}

export default function TextList(props: TextListProps) {
    const context = getContext();
    context.store.indices = context.store.indices || new WeakMap();

    function onTextChange(e: {target: HTMLInputElement}) {
        const index = context.store.indices.get(e.target);
        const values = props.values.slice();
        const value = e.target.value.trim();
        if (values.includes(value)) {
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
        const saveIndex = (node: Element) => context.store.indices.set(node, index);
        return (
            <TextBox
                class="text-list__textbox"
                value={text}
                onrender={saveIndex}
                placeholder={props.placeholder}
            />
        );
    }

    let shouldFocus = false;

    const node = context.node;
    const prevProps: TextListProps | null = context.prev ? context.prev.props : null;
    if (node && props.isFocused && (
        !prevProps ||
        !prevProps.isFocused ||
        prevProps.values.length < props.values.length
    )) {
        focusLastNode();
    }

    function didMount(node: Element) {
        context.store.node = node;
        if (props.isFocused) {
            focusLastNode();
        }
    }

    function focusLastNode() {
        const node = context.store.node as Element;
        shouldFocus = true;
        requestAnimationFrame(() => {
            const inputs = node.querySelectorAll('.text-list__textbox');
            const last = inputs.item(inputs.length - 1) as HTMLInputElement;
            last.focus();
        });
    }

    return (
        <VirtualScroll
            root={(
                <div
                    class={['text-list', props.class]}
                    onchange={onTextChange}
                    oncreate={didMount}
                />
            )}
            items={props.values
                .map(createTextBox)
                .concat(createTextBox('', props.values.length))}
            scrollToIndex={shouldFocus ? props.values.length : -1}
        />
    );
}
