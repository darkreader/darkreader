import {html} from 'malevic';

interface ToggleProps {
    checked: boolean;
    class?: string;
    labelOn: string;
    labelOff: string;
    onChange: (checked: boolean) => void;
}

export default function Toggle(props: ToggleProps) {
    const {checked, onChange} = props;

    const cls = {
        'toggle': true,
        'toggle--checked': checked,
        [props.class]: props.class
    };

    const clsOn = {
        'toggle__btn': true,
        'toggle__on': true,
        'toggle__btn--active': checked
    };

    const clsOff = {
        'toggle__btn': true,
        'toggle__off': true,
        'toggle__btn--active': !checked
    };

    return (
        <span class={cls}>
            <span
                class={clsOn}
                onclick={onChange ? () => !checked && onChange(true) : null}
            >
                {props.labelOn}
            </span>
            <span
                class={clsOff}
                onclick={onChange ? () => checked && onChange(false) : null}
            >
                {props.labelOff}
            </span>
        </span>
    );
}
