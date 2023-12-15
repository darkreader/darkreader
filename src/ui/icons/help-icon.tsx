import {m} from 'malevic';

export function HelpIcon(): Malevic.Child {
    return (
        <svg viewBox="0 0 16 16">
            <circle fill="none" stroke="currentColor" stroke-width="1" cx="8" cy="8" r="7" />
            <text fill="currentColor" font-weight="bold" font-size="12" text-anchor="middle" alignment-baseline="central" x="8" y="7">?</text>
        </svg>
    );
}
