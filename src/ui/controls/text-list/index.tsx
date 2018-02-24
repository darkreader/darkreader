import {html} from 'malevic';
import Col from '../col';
import TextBox from '../textbox';

interface TextListProps {
    values: string[];
    placeholder: string;
    onChange: (values: string[]) => void;
}

export default function TextList(props: TextListProps) {

    const textDomNodes: HTMLInputElement[] = [];

    function createTextBox(text: string, index: number) {

        function saveNodeRef(domNode: HTMLInputElement) {
            textDomNodes.push(domNode);
        }

        return (
            <TextBox
                class="text-list__textbox"
                value={text}
                placeholder={props.placeholder}
                didmount={saveNodeRef}
                didupdate={saveNodeRef}
            />
        );
    }

    function onTextChange() {
        const values = textDomNodes.map((node) => node.value);
        props.onChange(values);
    }

    return (
        <Col class="text-list" onchange={onTextChange}>
            {props.values.map(createTextBox)}
            {createTextBox('', props.values.length)}
        </Col>
    );
}
