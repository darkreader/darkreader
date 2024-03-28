import {m} from 'malevic';

export function KeyboardIcon(): Malevic.Child {
    return (
        <svg viewBox="0 0 16 16">
            <rect fill="none" stroke="var(--icon-color, currentColor)" stroke-width="1" x="2" y="4" width="12" height="8" />
            <g stroke="var(--icon-color, currentColor)" stroke-width="1">
                <line x1="4" y1="10" x2="12" y2="10" />
                <line x1="4" y1="6" x2="6" y2="6" />
                <line x1="7" y1="6" x2="9" y2="6" />
                <line x1="10" y1="6" x2="12" y2="6" />
                <line x1="5.5" y1="8" x2="7.5" y2="8" />
                <line x1="8.5" y1="8" x2="10.5" y2="8" />
            </g>
        </svg>
    );
}
