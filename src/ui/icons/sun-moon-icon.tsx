import {m} from 'malevic';

import {isNightAtLocation} from '../../utils/time';

interface SunMoonIconProps {
    date: Date;
    latitude: number;
    longitude: number;
}

export function SunMoonIcon({date, latitude, longitude}: SunMoonIconProps): Malevic.Child {
    if (latitude == null || longitude == null) {
        // question mark icon
        return (
            <svg viewBox="0 0 16 16">
                <text
                    fill="white"
                    font-size="16"
                    font-weight="bold"
                    text-anchor="middle"
                    x="8"
                    y="14"
                >?</text>
            </svg>
        );
    }

    if (isNightAtLocation(latitude, longitude, date)) {
        // moon icon
        return (
            <svg viewBox="0 0 16 16">
                <path fill="white" stroke="none" d="M 6 3 Q 10 8 6 13 Q 12 13 12 8 Q 12 3 6 3" />
            </svg>
        );
    }

    // sun icon
    return (
        <svg viewBox="0 0 16 16">
            <circle fill="white" stroke="none" cx="8" cy="8" r="3" />
            <g fill="none" stroke="white" stroke-linecap="round" stroke-width="1.5">
                {...(Array.from({length: 8}).map((_, i) => {
                    const cx = 8;
                    const cy = 8;
                    const angle = i * Math.PI / 4 + Math.PI / 8;
                    const pt = [5, 6].map((l) => [
                        cx + l * Math.cos(angle),
                        cy + l * Math.sin(angle),
                    ]);
                    return (
                        <line
                            x1={pt[0][0]}
                            y1={pt[0][1]}
                            x2={pt[1][0]}
                            y2={pt[1][1]}
                        />
                    );
                }))}
            </g>
        </svg>
    );
}
