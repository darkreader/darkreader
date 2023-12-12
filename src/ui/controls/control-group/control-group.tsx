import {m} from 'malevic';

function ControlGroup(
    props: {class?: string},
    control: Malevic.Spec,
    description: Malevic.Spec,
) {
    return (
        <span class={['control-group', props.class]}>
            {control}
            {description}
        </span>
    );
}

function Control(props: {class?: string}, ...content: Malevic.Child[]) {
    return (
        <span class={['control-group__control', props.class]} >
            {...content}
        </span>
    );
}

function Description(props: {class?: string}, ...content: Malevic.Child[]) {
    return (
        <span class={['control-group__description', props.class]}>
            {...content}
        </span>
    );
}

export default Object.assign(ControlGroup, {Control, Description});
