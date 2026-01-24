import {m} from 'malevic';

interface KeyIconProps {
    class?: string;
    color?: string;
}

export function KeyIcon(props: KeyIconProps): Malevic.Child {
    return (
        <svg viewBox="-8 -8 16 16" class={props.class}>
            <g stroke={props.color ?? 'currentColor'} stroke-width="2">
                <circle r="3" cx="-4" cy="0" />
                <path d="M-1,0 h6 v3" />
                <path d="M4,0 v2.5" />
            </g>
        </svg>
    );
}
