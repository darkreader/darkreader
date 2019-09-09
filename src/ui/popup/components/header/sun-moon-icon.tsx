import {m} from 'malevic';
import {isNightAtLocation} from '../../../../utils/time';

export default function SunMoonIcon({date, latitude, longitude}) {
    if (latitude == null || longitude == null) {
        // question mark icon
        return (
            <svg viewBox="-2.5 -2.5 21 21">
                <path fill="white" stroke="none" d="M7.78 0C10.55 0 13.28 1.27 13.28 4.32C13.28 7.14 10.05 8.21 9.36 9.23C8.84 9.99 9.02 11.05 7.59 11.05C6.66 11.05 6.21 10.29 6.21 9.6C6.21 7.03 9.99 6.45 9.99 4.32C9.99 3.16 9.21 2.46 7.91 2.46C5.14 2.46 6.23 5.32 4.13 5.32C3.38 5.32 2.73 4.86 2.73 4C2.72 1.88 5.14 0 7.79 0Z M7.68 12.45C8.65 12.45 9.45 13.25 9.45 14.23C9.45 15.2 8.65 16 7.68 16C6.7 16 5.9 15.2 5.9 14.23C5.9 13.25 6.7 12.45 7.68 12.45Z" />
            </svg>
        );
    }

    if (isNightAtLocation(date, latitude, longitude)) {
        // moon icon
        return (
            <svg viewBox="0 0 16 16">
                <path fill="white" stroke="none" d="M 6 3 Q 10 8 6 13 Q 12 13 12 8 Q 12 3 6 3" />
            </svg>
        );
    }

    // sun icon
    return (
        <svg viewBox="-4.5 -4.5 41 41">
            <circle fill="white" stroke="none" cx="16" cy="16" r="8" />
            {...(Array.from({length: 8}).map((_, i) => (
                <line
                    x1="2"
                    y1="16"
                    x2="4"
                    y2="16"
                    stroke="white"
                    stroke-width="5"
                    stroke-linecap="round"
                    transform-origin="16 16"
                    transform={`rotate(${i * 45})`}
                />
            )))}
        </svg>
    );
}
