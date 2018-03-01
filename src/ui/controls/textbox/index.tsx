import {html} from 'malevic';
import {mergeClass, omitAttrs} from '../utils';

export default function TextBox(props: Malevic.NodeAttrs = {}, text?: string) {
    const cls = mergeClass('textbox', props.class);
    const attrs = omitAttrs(['class', 'type'], props);

    return (
        <input class={cls} type="text" {...attrs} />
    );
}
