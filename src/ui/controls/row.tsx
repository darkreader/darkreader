import { html } from 'malevic';
import { mergeClass, omitAttrs } from './utils';

export default function Row(props: Malevic.NodeAttrs, ...children) {
    props = props || {};
    const cls = mergeClass('row', props.class);
    const attrs = omitAttrs(['class'], props);

    return (
        <div class={cls} {...attrs}>
            {children}
        </div>
    );
}
