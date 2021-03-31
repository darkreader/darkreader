import {m} from 'malevic';
import ThemeControl from './theme-control';
import {ColorDropDown} from '../../../controls';

type LinkColorEditorValue = 'auto' | string;

interface LinkColorEditorProps {
    value: LinkColorEditorValue;
    onChange: (value: LinkColorEditorValue) => void;
    onReset: () => void;
}

export default function LinkColorEditor(props: LinkColorEditorProps) {
    return (
        <ThemeControl label="Links">
            <ColorDropDown
                value={props.value}
                colorSuggestion={'#3391ff'}
                onChange={props.onChange}
                onReset={props.onReset}
                hasAutoOption
            />
        </ThemeControl>
    );
}
