import {m} from 'malevic';

interface SystemIconProps {
    ariaHidden?: boolean;
}

export function SystemIcon(props: SystemIconProps): Malevic.Child {
    return (
        <svg viewBox="0 0 16 16" aria-hidden={props.ariaHidden ?? true}>
            <path
                fill="white"
                stroke="none"
                d="M3,3 h10 v7 h-3 v2 h1 v1 h-6 v-1 h1 v-2 h-3 z M4.5,4.5 v4 h7 v-4 z"
            />
        </svg>
    );
}
