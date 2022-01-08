// @ts-check
import {mergeClass, omitAttrs} from '../utils';
import {tags} from 'malevic/dom';
const {button, span} = tags;

/**
 * @param {Malevic.NodeAttrs} props
 * @param  {Malevic.Child[]} children
 * @returns {Malevic.NodeSpec}
 */
export default function Button(props, ...children) {
    const cls = mergeClass('button', props.class);
    const attrs = omitAttrs(['class'], props);

    return (
        button({class: cls, ...attrs},
            span({class: 'button__wrapper'},
                ...children,
            ),
        )
    );
}
