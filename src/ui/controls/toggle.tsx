import { html } from 'malevic';

interface ToggleProps {
    checked: boolean;
    labelOn: string;
    labelOff: string;
    onChange?: (checked: boolean) => void;
}

/**
 * Toggle switch.
 */
export default function Toggle(props: ToggleProps) {

    const cls = {
        'toggle': true,
        'toggle--checked': props.checked
    };

    const clsOn = {
        'toggle__btn': true,
        'toggle__on': true,
        'toggle__btn--active': props.checked
    };

    const clsOff = {
        'toggle__btn': true,
        'toggle__off': true,
        'toggle__btn--active': !props.checked
    };

    return (
        <div class={cls}>
            <span
                class={clsOn}
                onclick={() => props.onChange(true)}
            >
                {props.labelOn}
            </span>
            <span
                class={clsOff}
                onclick={() => props.onChange(false)}
            >
                {props.labelOff}
            </span>
        </div>
    );
}
