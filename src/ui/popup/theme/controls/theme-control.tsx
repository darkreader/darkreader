import {m} from 'malevic';

export default function ThemeControl(props: {label: Malevic.Child}, controls: Malevic.Child[]) {
    return (
        <span class="theme-control">
            <label class="theme-control__label">
                {props.label}
            </label>
            {controls}
        </span>
    );
}
