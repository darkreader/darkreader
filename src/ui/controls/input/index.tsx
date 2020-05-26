import {m} from 'malevic';
import {mergeClass} from '../utils';


export default function InputFile(props: Malevic.NodeAttrs, ...children: any[]) {
    const cls = mergeClass('checkbox', props.class);

    return (
        <input type="file"
            class={cls}
            onchange={props.onchange} >
            <span class="input__wrapper">
                {...children}
            </span>
        </input>
    );
}
