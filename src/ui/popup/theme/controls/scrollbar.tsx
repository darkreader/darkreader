import {m} from 'malevic';
import ThemeControl from './theme-control';
import {ColorDropDown} from '../../../controls';

type ScrollbarColorValue = '' | 'auto' | string;

interface ScrollbarEditorProps {
    value: ScrollbarColorValue;
    onChange: (value: ScrollbarColorValue) => void;
    onReset: () => void;
}

export default function ScrollbarEditor(props: ScrollbarEditorProps) {
    return (
        <ThemeControl label="Scrollbar">
            <ColorDropDown
                value={props.value}
                colorSuggestion={'#959799'}
                onChange={props.onChange}
                onReset={props.onReset}
                hasAutoOption
                hasDefaultOption
            />
        </ThemeControl>
    );
}
