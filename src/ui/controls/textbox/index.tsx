import {m} from 'malevic';
import {mergeClass, omitAttrs} from '../utils';

interface TextBoxProps extends Malevic.NodeAttrs {
    oninput?: (e: Event & {target: HTMLInputElement}) => void;
    onchange?: (e: Event & {target: HTMLInputElement}) => void;
}

export default function TextBox(props: TextBoxProps) {
    const cls = mergeClass('textbox', props.class);
    const attrs = omitAttrs(['class', 'type'], props);

    return (
        <input class={cls} type="text" spellcheck="false" {...attrs} />
    );
}
