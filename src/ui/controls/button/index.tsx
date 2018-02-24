import {html} from 'malevic';
import {mergeClass, omitAttrs} from '../utils';

export default function Button(props: Malevic.NodeAttrs, ...children) {
    const cls = mergeClass('button', props.class);
    const attrs = omitAttrs(['class'], props);

    return (
        <span class={cls} {...attrs}>
            {...children}
        </span>
    );
}
