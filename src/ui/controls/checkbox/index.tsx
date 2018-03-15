import {html} from 'malevic';
import {mergeClass, omitAttrs} from '../utils';

export default function CheckBox(props: Malevic.NodeAttrs = {}) {
    const cls = mergeClass('checkbox', props.class);
    const attrs = omitAttrs(['class', 'checked', 'onchange'], props);

    return (
        <label class={cls} {...attrs}>
            <input
                class="checkbox__input"
                type="checkbox"
                checked={props.checked}
                onchange={props.onchange}
            />
            <span class="checkbox__checkmark"></span>
        </label>
    );
}
