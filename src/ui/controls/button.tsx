import { html } from 'malevic';
import { mergeClass, omitAttrs } from './utils';

export default function Button(props: Malevic.NodeAttrs, text?: any) {
    props = props || {};
    const cls = mergeClass('button', props.class);
    const attrs = omitAttrs(['class'], props);

    return (
        <button class={cls} {...attrs}>
            {text}
        </button>
    );
}
