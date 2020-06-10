import {m} from 'malevic';
import {ColorDropDown} from '../../../controls';
import ThemeControl from './theme-control';

type BgColorValue = 'auto' | string;

interface BgColorEditorProps {
    value: BgColorValue;
    defaultColor: string;
    onChange: (value: BgColorValue) => void;
    onReset: () => void;
}

export default function BackgroundColorEditor(props: BgColorEditorProps) {
    return (
        <ThemeControl label="Background">
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
