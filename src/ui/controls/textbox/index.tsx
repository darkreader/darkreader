import {m} from 'malevic';

import {mergeClass, omitAttrs} from '../utils';

interface TextBoxProps extends Malevic.NodeAttrs {
    type?: 'text' | 'time';
    oninput?: (e: Event & {target: HTMLInputElement}) => void;
    onchange?: (e: Event & {target: HTMLInputElement}) => void;
}

export default function TextBox(props: TextBoxProps) {
    const cls = mergeClass('textbox', props.class);
    const attrs = omitAttrs(['class', 'type'], props);
    const type = props.type || 'text';

    return (
        <input class={cls} type={type} spellcheck="false" {...attrs} />
    );
}
