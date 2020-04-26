import {m} from 'malevic';

export default function ThemeControl(props: {label: Malevic.Child, reset: () => void}, control: Malevic.Child) {
    return (
        <span class="theme-control">
            <div class="theme-control__div">
                <label class="theme-control__label">
                    {props.label}
                </label>
                {control}
            </div>
            <span class="reset-button"
                onclick={props.reset}>
            Reset
            </span>
        </span>
    );
}
