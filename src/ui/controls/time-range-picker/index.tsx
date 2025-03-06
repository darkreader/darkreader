import {m} from 'malevic';

import {parseTime} from '../../../utils/time';
import TextBox from '../textbox';

interface TimePickerProps {
    startTime: string;
    endTime: string;
    onChange: ([start, end]: [string, string]) => void;
}

function toLong24HTime($time: string) {
    const [hours, minutes] = parseTime($time);
    const hh = `${hours < 10 ? '0' : ''}${hours}`;
    const mm = `${minutes < 10 ? '0' : ''}${minutes}`;
    return `${hh}:${mm}`;
}

function to24HTime($time: string) {
    const [hours, minutes] = parseTime($time);
    const mm = `${minutes < 10 ? '0' : ''}${minutes}`;
    return `${hours}:${mm}`;
}

export default function TimeRangePicker(props: TimePickerProps) {
    function onStartTimeChange($startTime: string) {
        props.onChange([to24HTime($startTime), props.endTime]);
    }

    function onEndTimeChange($endTime: string) {
        props.onChange([props.startTime, to24HTime($endTime)]);
    }

    function setStartTime(node: HTMLInputElement) {
        node.value = toLong24HTime(props.startTime);
    }

    function setEndTime(node: HTMLInputElement) {
        node.value = toLong24HTime(props.endTime);
    }

    return (
        <span class="time-range-picker">
            <TextBox
                class="time-range-picker__input time-range-picker__input--start"
                type="time"
                placeholder="18:00"
                onrender={setStartTime}
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
                type="time"
                placeholder="09:00"
                onrender={setEndTime}
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
