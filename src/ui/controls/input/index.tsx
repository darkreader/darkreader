import {html} from 'malevic';
import {mergeClass, omitAttrs} from '../utils';

export default function Input(props: Malevic.NodeAttrs = {}) {
    const cls = mergeClass('input', props.class);
    const attrs = omitAttrs(['class', 'onchange'], props);

    return (
        <label class={cls} {...attrs}>
            <input
                class="jscolor"
                type="input"
                onchange={props.onchange}
            />
        </label>
    );
}