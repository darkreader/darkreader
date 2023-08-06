import { m } from 'malevic';
import { mergeClass, omitAttrs } from '../utils';

export default function IconButton(
    props: Malevic.NodeAttrs,
    ...children: Malevic.Child[]
) {
    const cls = mergeClass('icon-button', props.class);
    const attrs = omitAttrs(['class'], props);

    return (
        <button class={cls} {...attrs}>
            <span class='button__wrapper'>{...children}</span>
        </button>
    );
}
