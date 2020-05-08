import {m} from 'malevic';
import ThemeControl from './theme-control';
import {ColorDropDown} from '../../../controls';

type SelectionColorValue = '' | 'auto' | string;

interface SelectionEditorProps {
    value: SelectionColorValue;
    onChange: (value: SelectionColorValue) => void;
    onReset: () => void;
}

export default function SelectionEditor(props: SelectionEditorProps) {
    return (
        <ThemeControl label="Selection">
            <ColorDropDown
                value={props.value}
                onChange={props.onChange}
                onReset={props.onReset}
                hasAutoOption
                hasDefaultOption
            />
        </ThemeControl>
    );
}
