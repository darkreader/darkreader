import {html} from 'malevic';
import TextBox from '../textbox';
import {getUILanguage} from '../../../utils/locales';

interface TimePickerProps {
    startTime: string;
    endTime: string;
    onChange: ([start, end]: [string, string]) => void;
}

const is12H = (new Date()).toLocaleTimeString(getUILanguage()).endsWith('M');

function parseTime($time: string) {
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

    return [hours, minutes];
}

function toLocaleTime($time: string) {
    const [hours, minutes] = parseTime($time);

    const mm = `${minutes < 10 ? '0' : ''}${minutes}`;

    if (is12H) {
        const h = (hours === 0 ?
            '12' :
            hours > 12 ?
                (hours - 12) :
                hours);
        return `${h}:${mm}${hours < 12 ? 'AM' : 'PM'}`;
    }

    return `${hours}:${mm}`;
}

function to24HTime($time: string) {
    const [hours, minutes] = parseTime($time);
    const mm = `${minutes < 10 ? '0' : ''}${minutes}`;
    return `${hours}:${mm}`;
}

export default function TimeRangePicker(props: TimePickerProps) {
    function onStartTimeChange($startTime: string) {
        props.onChange([to24HTime($startTime), props.endTime])
    }

    function onEndTimeChange($endTime: string) {
        props.onChange([props.startTime, to24HTime($endTime)])
    }

    return (
        <span class="time-range-picker">
            <TextBox
                class="time-range-picker__input time-range-picker__input--start"
                placeholder={toLocaleTime('18:00')}
                didmount={(node: HTMLInputElement) => node.value = toLocaleTime(props.startTime)}
                didupdate={(node: HTMLInputElement) => node.value = toLocaleTime(props.startTime)}
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
                placeholder={toLocaleTime('9:00')}
                didmount={(node: HTMLInputElement) => node.value = toLocaleTime(props.endTime)}
                didupdate={(node: HTMLInputElement) => node.value = toLocaleTime(props.endTime)}
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