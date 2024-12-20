import {m} from 'malevic';

import {mergeClass, omitAttrs} from '../utils';

export default function CheckBox(props: Malevic.NodeAttrs, ...children: Malevic.Child[]) {
    const cls = mergeClass('checkbox', props.class);
    const attrs = omitAttrs(['class', 'checked', 'onchange'], props);
    const check = (domNode: HTMLInputElement) => domNode.checked = Boolean(props.checked);

    return (
        <label class={cls} {...attrs}>
            <input
                class="checkbox__input"
                type="checkbox"
                checked={props.checked}
                onchange={props.onchange}
                onrender={check}
            />
            <span class="checkbox__checkmark"></span>
            <span class="checkbox__content">{children}</span>
        </label>
    );
}
