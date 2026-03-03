import type {Child} from 'malevic';
import {m} from 'malevic';

interface ToggleProps {
    checked: boolean;
    class?: string;
    labelOn: Child;
    labelOff: Child;
    onChange: (checked: boolean) => void;
}

export default function Toggle(props: ToggleProps) {
    const {checked, onChange} = props;

    const cls = [
        'toggle',
        checked ? 'toggle--checked' : null,
        props.class,
    ];

    const clsOn = {
        'toggle__btn': true,
        'toggle__on': true,
        'toggle__btn--active': checked,
    };

    const clsOff = {
        'toggle__btn': true,
        'toggle__off': true,
        'toggle__btn--active': !checked,
    };

    const handleKeyDown = (e: KeyboardEvent, newValue: boolean) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange && onChange(newValue);
        }
    };

    return (
        <span class={cls} role="group" aria-label={`Toggle is ${checked ? 'on' : 'off'}`}>
            <span
                class={clsOn}
                role="button"
                tabindex="0"
                aria-pressed={checked}
                aria-label="Toggle on"
                onclick={onChange ? () => !checked && onChange(true) : undefined}
                onkeydown={onChange ? (e) => handleKeyDown(e, true) : undefined}
            >
                {props.labelOn}
            </span>
            <span
                class={clsOff}
                role="button"
                tabindex="0"
                aria-pressed={!checked}
                aria-label="Toggle off"
                onclick={onChange ? () => checked && onChange(false) : undefined}
                onkeydown={onChange ? (e) => handleKeyDown(e, false) : undefined}
            >
                {props.labelOff}
            </span>
        </span>
    );
}
