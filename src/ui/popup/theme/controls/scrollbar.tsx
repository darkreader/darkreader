import {m} from 'malevic';
import ThemeControl from './theme-control';
import {ColorDropDown} from '../../../controls';
import {getLocalMessage} from '../../../../utils/locales';

type ScrollbarColorValue = '' | 'auto' | string;

interface ScrollbarEditorProps {
    value: ScrollbarColorValue;
    onChange: (value: ScrollbarColorValue) => void;
    onReset: () => void;
}

export default function ScrollbarEditor(props: ScrollbarEditorProps) {
    return (
        <ThemeControl label={getLocalMessage('scrollbar')}>
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
