import {m} from 'malevic';
import {ColorDropDown} from '../../../controls';
import ThemeControl from './theme-control';

type TextColorValue = 'auto' | string;

interface TextColorEditorProps {
    value: TextColorValue;
    defaultColor: string;
    onChange: (value: TextColorValue) => void;
    onReset: () => void;
}

export default function TextColorEditor(props: TextColorEditorProps) {
    return (
        <ThemeControl label="Text">
            <ColorDropDown
                value={props.value}
                colorSuggestion={props.defaultColor}
                onChange={props.onChange}
                onReset={props.onReset}
                hasAutoOption
            />
        </ThemeControl>
    );
}
