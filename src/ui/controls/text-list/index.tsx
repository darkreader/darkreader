import {html} from 'malevic';
import TextBox from '../textbox';

interface TextListProps {
    values: string[];
    placeholder: string;
    isFocused?: boolean;
    class?: string;
    onChange: (values: string[]) => void;
}

export default function TextList(props: TextListProps) {

    const textDomNodes: HTMLInputElement[] = [];

    function saveTextNodeRef(domNode: HTMLInputElement) {
        textDomNodes.push(domNode);
    }

    function createTextBox(text: string, index: number) {
        let update: (domNode: HTMLInputElement) => void;
        if (props.isFocused && index === props.values.length) {
            update = (domNode) => {
                saveTextNodeRef(domNode);
                domNode.focus();
            };
        } else {
            update = saveTextNodeRef;
        }
        return (
            <TextBox
                class={['text-list__textbox', props.class]}
                value={text}
                placeholder={props.placeholder}
                didmount={update}
                didupdate={update}
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
