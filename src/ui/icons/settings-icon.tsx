import {m} from 'malevic';

interface SettingsIconProps {
    class?: string;
    color?: string;
}

export function SettingsIcon(props: SettingsIconProps): Malevic.Child {
    return (
        <svg viewBox="0 0 16 16" class={props.class}>
            <defs>
                <path id="cog" d="M-1.25,-6.5 h2.5 l1,3 h-4.5 z" />
            </defs>
            <g transform="translate(8 8)" fill={props.color ?? 'currentColor'}>
                <path d="M0,-5 a5,5 0 0 1 0,10 a5,5 0 0 1 0,-10 z M0,-3 a3,3 0 0 0 0,6 a3,3 0 0 0 0,-6 z" />
                <use href="#cog" />
                <use href="#cog" transform="rotate(60)" />
                <use href="#cog" transform="rotate(120)" />
                <use href="#cog" transform="rotate(180)" />
                <use href="#cog" transform="rotate(240)" />
                <use href="#cog" transform="rotate(300)" />
            </g>
        </svg>
    );
}
