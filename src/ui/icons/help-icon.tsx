import {m} from 'malevic';

export function HelpIcon(): Malevic.Child {
    return (
        <svg viewBox="0 0 16 16">
            <circle fill="none" stroke="currentColor" stroke-width="1" cx="8" cy="8" r="7" />
            <text fill="currentColor" x="8" y="12" text-anchor="middle" font-size="12" font-weight="bold">
                ?
            </text>
        </svg>
    );
}
