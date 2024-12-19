import {m} from 'malevic';

import {ColorPicker} from '../../../controls';

import ThemeControl from './theme-control';

type BgColorValue = 'auto' | string;

interface BgColorEditorProps {
    value: BgColorValue;
    onChange: (value: BgColorValue) => void;
    canReset: boolean;
    onReset: () => void;
}

export default function BackgroundColorEditor(props: BgColorEditorProps) {
    return (
        <ThemeControl label="Background">
            <ColorPicker
                color={props.value}
                onChange={props.onChange}
                canReset={props.canReset}
                onReset={props.onReset}
            />
        </ThemeControl>
    );
}
