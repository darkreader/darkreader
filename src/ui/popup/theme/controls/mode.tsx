import {m} from 'malevic';

import {ThemeEngine} from '../../../../generators/theme-engines';
import {getLocalMessage} from '../../../../utils/locales';
import {DropDown} from '../../../controls';
import {openExtensionPage} from '../../../utils';

import ThemeControl from './theme-control';

export default function Mode(props: {mode: ThemeEngine; onChange: (mode: ThemeEngine) => void}) {
    async function openCSSEditor() {
        await openExtensionPage('stylesheet-editor');
    }

    const modes = [
        {id: ThemeEngine.dynamicTheme, content: getLocalMessage('engine_dynamic')},
        {id: ThemeEngine.cssFilter, content: getLocalMessage('engine_filter')},
        {id: ThemeEngine.svgFilter, content: getLocalMessage('engine_filter_plus')},
        {id: ThemeEngine.staticTheme, content: getLocalMessage('engine_static')},
    ];
    return (
        <ThemeControl label="Mode">
            <div class="mode-control-container">
                <DropDown
                    selected={modes.find((m) => m.id === props.mode)!.id}
                    options={modes}
                    onChange={props.onChange}
                />
                <span
                    class={{
                        'static-edit-button': true,
                        'static-edit-button--hidden': props.mode !== ThemeEngine.staticTheme,
                    }}
                    onclick={openCSSEditor}
                />
            </div>
        </ThemeControl>
    );
}
