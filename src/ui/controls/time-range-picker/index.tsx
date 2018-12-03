import {html} from 'malevic';
import TextBox from '../textbox';
import {getUILanguage} from '../../../utils/locales';

interface TimePickerProps {
    startTime: string;
    endTime: string;
    onChange: ([start, end]: [string, string]) => void;
}

const is12H = (new Date()).toLocaleTimeString(getUILanguage()).endsWith('M');

function fixTime($time: string) {
    const parts = $time.split(':').slice(0, 2);
    const lowercased = $time.trim().toLowerCase();
    const isAM = lowercased.endsWith('am') || lowercased.endsWith('a.m.');
    const isPM = lowercased.endsWith('pm') || lowercased.endsWith('p.m.');

    let hours = parts.length > 0 ? parseInt(parts[0]) : 0;
    if (isNaN(hours) || hours > 23) {
        hours = 0;
    }
    if (isAM && hours === 12) {
        hours = 0;
    }
    if (isPM) {
        hours += 12;
    }

    let minutes = parts.length > 1 ? parseInt(parts[1]) : 0;
    if (isNaN(minutes) || minutes > 59) {
        minutes = 0;
    }

    const mm = `${minutes < 10 ? '0' : ''}${minutes}`;

    if (is12H) {
        const h = (hours === 0 ?
            '12' :
            hours > 12 ?
                (hours - 12) :
                hours);
        return `${h}${mm}${hours < 12 ? 'AM' : 'PM'}`;
    }

    return `${hours}:${mm}`;
}

export default function TimeRangePicker(props: TimePickerProps) {
    function onStartTimeChange($startTime: string) {
        props.onChange([fixTime($startTime), props.endTime])
    }

    function onEndTimeChange($endTime: string) {
        props.onChange([props.startTime, fixTime($endTime)])
    }

    return (
        <span class="time-range-picker">
            <TextBox
                class="time-range-picker__input time-range-picker__input--start"
                placeholder="18:00"
                didmount={(node: HTMLInputElement) => node.value = props.startTime}
                didupdate={(node: HTMLInputElement) => node.value = props.startTime}
                onchange={(e) => onStartTimeChange((e.target as HTMLInputElement).value)}
                onkeypress={(e) => {
                    if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        input.blur();
                        onStartTimeChange(input.value);
                    }
                }}

            />
            <TextBox
                class="time-range-picker__input time-range-picker__input--end"
                placeholder="9:00"
                didmount={(node: HTMLInputElement) => node.value = props.endTime}
                didupdate={(node: HTMLInputElement) => node.value = props.endTime}
                onchange={(e) => onEndTimeChange((e.target as HTMLInputElement).value)}
                onkeypress={(e) => {
                    if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        input.blur();
                        onEndTimeChange(input.value);
                    }
                }}
            />
        </span>
    );
}