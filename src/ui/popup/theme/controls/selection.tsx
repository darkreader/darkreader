import {m} from 'malevic';

import {ColorDropDown} from '../../../controls';

import ThemeControl from './theme-control';

type SelectionColorValue = '' | 'auto' | string;

interface SelectionEditorProps {
    value: SelectionColorValue;
    onChange: (value: SelectionColorValue) => void;
    onReset: () => void;
}

export default function SelectionColorEditor(props: SelectionEditorProps) {
    return (
        <ThemeControl label="Selection">
            <ColorDropDown
                value={props.value}
                colorSuggestion={'#005ccc'}
                onChange={props.onChange}
                onReset={props.onReset}
                hasAutoOption
                hasDefaultOption
            />
        </ThemeControl>
    );
}
