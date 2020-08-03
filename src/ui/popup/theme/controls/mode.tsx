import {m} from 'malevic';
import ThemeEngines from '../../../../generators/theme-engines';
import {getLocalMessage} from '../../../../utils/locales';
import {DropDown} from '../../../controls';
import ThemeControl from './theme-control';
import {isFirefox, isMobile} from '../../../../utils/platform';

export default function Mode(props: {mode: string; onChange: (mode: string) => void}) {

    function getCSSEditorObject(): Promise<chrome.windows.Window> | Promise<chrome.tabs.Tab> {
        if (isMobile()) {
            return new Promise<chrome.tabs.Tab>((resolve) => {
                chrome.tabs.query({}, (t) => {
                    for (const tab of t) {
                        if (tab.url.endsWith('ui/stylesheet-editor/index.html')) {
                            resolve(tab);
                            return;
                        }
                    }
                    resolve(null);
                });
            });
        }
        return new Promise<chrome.windows.Window>((resolve) => {
            chrome.windows.getAll({
                populate: true,
                windowTypes: ['popup']
            }, (w) => {
                for (const window of w) {
                    if (window.tabs[0].url.endsWith('ui/stylesheet-editor/index.html')) {
                        resolve(window);
                        return;
                    }
                }
                resolve(null);
            });
        });
    }
    
    async function openCSSEditor() {
        const cssEditorObject = await getCSSEditorObject();
        if (isMobile()) {
            if (cssEditorObject) {
                chrome.tabs.update(cssEditorObject.id, {'active': true});
                window.close();
            } else {
                chrome.tabs.create({
                    url: '../stylesheet-editor/index.html',
                });
                window.close();
            }
        } else {
            if (cssEditorObject) {
                chrome.windows.update(cssEditorObject.id, {'focused': true});
            } else {
                chrome.windows.create({
                    type: 'popup',
                    url: isFirefox() ? '../stylesheet-editor/index.html' : 'ui/stylesheet-editor/index.html',
                    width: 600,
                    height: 600,
                });
            }
        }
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
