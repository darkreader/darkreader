import {m} from 'malevic';
import ThemeEngines from '../../../../generators/theme-engines';
import {getLocalMessage} from '../../../../utils/locales';
import {DropDown} from '../../../controls';
import ThemeControl from './theme-control';
import {isFirefox} from '../../../../utils/platform';

export default function Mode(props: {mode: string; onChange: (mode: string) => void}) {

    function openCSSEditor() {
        chrome.windows.create({
            type: 'panel',
            url: isFirefox() ? '../stylesheet-editor/index.html' : 'ui/stylesheet-editor/index.html',
            width: 600,
            height: 600,
        });
    }

    const modes = [
        [ThemeEngines.dynamicTheme, getLocalMessage('engine_dynamic')],
        [ThemeEngines.cssFilter, getLocalMessage('engine_filter')],
        [ThemeEngines.svgFilter, getLocalMessage('engine_filter_plus')],
        [ThemeEngines.staticTheme, getLocalMessage('engine_static')],
    ];
    return (
        <ThemeControl label="Mode">
            <div class="mode-control-container">
                <DropDown
                    selected={modes.find((m) => m[0] === props.mode)[1]}
                    values={modes.map((m) => m[1])}
                    onChange={(v) => {
                        const mode = modes.find((m) => m[1] === v)[0];
                        props.onChange(mode);
                    }}
                />
                <span
                    class={{
                        'static-edit-button': true,
                        'static-edit-button--hidden': props.mode !== ThemeEngines.staticTheme,
                    }}
                    onclick={openCSSEditor}
                />
            </div>
        </ThemeControl>
    );
}
