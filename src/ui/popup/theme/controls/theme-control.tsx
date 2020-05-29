import {m} from 'malevic';

export default function ThemeControl(props: {label: Malevic.Child}, ...control) {
    return (
        <span class="theme-control">
            <label class="theme-control__label">
                {props.label}
            </label>
            {control}
        </span>
    );
}
