import {m} from 'malevic';

interface WatchIconProps {
    color?: string;
    hours: number;
    minutes: number;
}

export function WatchIcon(props: WatchIconProps): Malevic.Child {
    const {hours, minutes, color = 'white'} = props;
    const cx = 8;
    const cy = 8.5;
    const lenHour = 3;
    const lenMinute = 4;
    const clockR = 5.5;
    const btnSize = 2;
    const btnPad = 1.5;
    const ah = ((hours > 11 ? hours - 12 : hours) + minutes / 60) / 12 * Math.PI * 2;
    const am = minutes / 60 * Math.PI * 2;
    const hx = cx + lenHour * Math.sin(ah);
    const hy = cy - lenHour * Math.cos(ah);
    const mx = cx + lenMinute * Math.sin(am);
    const my = cy - lenMinute * Math.cos(am);

    return (
        <svg viewBox="0 0 16 16">
            <circle fill="none" stroke={color} stroke-width="1.5" cx={cx} cy={cy} r={clockR} />
            <line stroke={color} stroke-width="1.5" x1={cx} y1={cy} x2={hx} y2={hy} />
            <line stroke={color} stroke-width="1.5" opacity="0.67" x1={cx} y1={cy} x2={mx} y2={my} />
            {[30, -30].map((angle) => {
                return (
                    <path
                        fill={color}
                        transform={`rotate(${angle})`}
                        transform-origin={`${cx} ${cy}`}
                        d={`M${cx - btnSize},${cy - clockR - btnPad} a${btnSize},${btnSize} 0 0 1 ${2 * btnSize},0 z`} />
                );
            })}
        </svg>
    );
}
