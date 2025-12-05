import {m} from 'malevic';

import {ColorPicker} from '../../../controls';

import ThemeControl from './theme-control';

type TextColorValue = 'auto' | string;

interface TextColorEditorProps {
    value: TextColorValue;
    onChange: (value: TextColorValue) => void;
    canReset: boolean;
    onReset: () => void;
}

export default function TextColorEditor(props: TextColorEditorProps) {
    return (
        <ThemeControl label="Text">
            <ColorPicker
                color={props.value}
                onChange={props.onChange}
                canReset={props.canReset}
                onReset={props.onReset}
            />
        </ThemeControl>
    );
}
