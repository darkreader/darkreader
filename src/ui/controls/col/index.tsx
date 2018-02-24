import {html} from 'malevic';
import {mergeClass, omitAttrs} from '../utils';

export default function Col(props: Malevic.NodeAttrs = {}, ...children) {
    const cls = mergeClass('col', props.class);
    const attrs = omitAttrs(['class'], props);

    return (
        <div class={cls} {...attrs}>
            {children}
        </div>
    );
}
