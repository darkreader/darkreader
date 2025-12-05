import {m} from 'malevic';

import {mergeClass, omitAttrs} from '../utils';

export default function Button(props: Malevic.NodeAttrs, ...children: Malevic.Child[]) {
    const cls = mergeClass('button', props.class);
    const attrs = omitAttrs(['class'], props);

    return (
        <button class={cls} {...attrs}>
            <span class="button__wrapper">
                {...children}
            </span>
        </button>
    );
}
