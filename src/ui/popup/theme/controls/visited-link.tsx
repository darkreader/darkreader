import {m} from 'malevic';
import ThemeControl from './theme-control';
import {ColorDropDown} from '../../../controls';

type VisitedLinkColorEditorValue = '' | string;

interface VistedLinkColorEditorProps {
    value: VisitedLinkColorEditorValue;
    onChange: (value: VisitedLinkColorEditorValue) => void;
    onReset: () => void;
}

export default function VisitedLinkColorEditor(props: VistedLinkColorEditorProps) {
    return (
        <ThemeControl label="Links">
            <ColorDropDown
                value={props.value}
                colorSuggestion={'#3391ff'} // Oh almighty color wizard, what's an good suggestion for our precious users?
                onChange={props.onChange}
                onReset={props.onReset}
                hasDefaultOption
            />
        </ThemeControl>
    );
}
