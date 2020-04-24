import {m} from 'malevic';
import ThemeEngines from '../../../../generators/theme-engines';
import {getLocalMessage} from '../../../../utils/locales';
import {DropDown} from '../../../controls';
import ThemeControl from './theme-control';

export default function Mode(props: {mode: string; onChange: (mode: string) => void}) {
    const modes = [
        [ThemeEngines.dynamicTheme, getLocalMessage('engine_dynamic')],
        [ThemeEngines.cssFilter, getLocalMessage('engine_filter')],
        [ThemeEngines.staticTheme, getLocalMessage('engine_static')],
    ];
    return (
        <ThemeControl label="Mode">
            <DropDown
                selected={modes.find((m) => m[0] === props.mode)[1]}
                values={modes.map((m) => m[1])}
                onChange={(v) => {
                    const mode = modes.find((m) => m[1] === v)[0];
                    props.onChange(mode);
                }}
            />
        </ThemeControl>
    );
}
