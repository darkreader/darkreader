import {html} from 'malevic';
import TextBox from '../textbox';

interface TextListProps {
    values: string[];
    placeholder: string;
    isFocused?: boolean;
    class?: string;
    onChange: (values: string[]) => void;
}

const focusedNodes = new WeakSet<Element>();

export default function TextList(props: TextListProps) {

    const textDomNodes: HTMLInputElement[] = [];

    function createTextBox(text: string, index: number) {
        function onRender(domNode: HTMLInputElement) {
            textDomNodes.push(domNode);
            if (props.isFocused && index === props.values.length) {
                if (!focusedNodes.has(domNode)) {
                    focusedNodes.add(domNode);
                    domNode.focus();
                }
            } else {
                focusedNodes.delete(domNode);
            }
        }
        return (
            <TextBox
                class={['text-list__textbox', props.class]}
                value={text}
                placeholder={props.placeholder}
                didmount={onRender}
                didupdate={onRender}
            />
        );
    }

    function onTextChange() {
        const values = Array.from(new Set(textDomNodes
            .map((node) => node.value)
            .filter((text) => text.trim())));
        props.onChange(values);
    }

    return (
        <div class="text-list" onchange={onTextChange}>
            {props.values.map(createTextBox)}
            {createTextBox('', props.values.length)}
        </div>
    );
}
