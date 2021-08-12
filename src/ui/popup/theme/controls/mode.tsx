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
            url: isFirefox ? '../stylesheet-editor/index.html' : 'ui/stylesheet-editor/index.html',
            width: 600,
            height: 600,
        });
    }

    const modes = [
        {id: ThemeEngines.dynamicTheme, content: getLocalMessage('engine_dynamic')},
        {id: ThemeEngines.cssFilter, content: getLocalMessage('engine_filter')},
        {id: ThemeEngines.svgFilter, content: getLocalMessage('engine_filter_plus')},
        {id: ThemeEngines.staticTheme, content: getLocalMessage('engine_static')},
    ];
    return (
        <ThemeControl label="Mode">
            <div class="mode-control-container">
                <DropDown
                    selected={modes.find((m) => m.id === props.mode).id}
                    options={modes}
                    onChange={props.onChange}
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
