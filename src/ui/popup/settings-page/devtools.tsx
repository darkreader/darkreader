import {m} from 'malevic';
import ThemeEngines from '../../../generators/theme-engines';
import {getLocalMessage} from '../../../utils/locales';
import {Button} from '../../controls';
import ControlGroup from '../control-group';
import {ViewProps} from '../types';


function getExistingDevToolsWindow() {
    return new Promise<chrome.windows.Window>((resolve) => {
        chrome.windows.getAll({
            populate: true,
            windowTypes: ['popup']
        }, (w) => {
            for (const window of w) {
                if (window.tabs[0].url.endsWith('ui/devtools/index.html')) {
                    resolve(window);
                    return;
                }
            }
            resolve(null);
        });
    });
}

async function openDevTools() {
    const devToolsWindow = await getExistingDevToolsWindow();
    if (devToolsWindow) {
        chrome.windows.update(devToolsWindow.id, {'focused': true});
    } else {
        chrome.windows.create({
            type: 'popup',
            url: 'ui/devtools/index.html',
            width: 600,
            height: 600,
        });
    }
}

export default function DevToolsGroup(props: ViewProps) {
    const globalThemeEngine = props.data.settings.theme.engine;
    const devtoolsData = props.data.devtools;
    const hasCustomFixes = (
        (globalThemeEngine === ThemeEngines.dynamicTheme && devtoolsData.hasCustomDynamicFixes) ||
        ([ThemeEngines.cssFilter, ThemeEngines.svgFilter].includes(globalThemeEngine) && devtoolsData.hasCustomFilterFixes) ||
        (globalThemeEngine === ThemeEngines.staticTheme && devtoolsData.hasCustomStaticFixes)
    );

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Button
                    onclick={openDevTools}
                    class={{
                        'dev-tools-button': true,
                        'dev-tools-button--has-custom-fixes': hasCustomFixes,
                    }}
                >
                    🛠 {getLocalMessage('open_dev_tools')}
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Make a fix for a website
            </ControlGroup.Description>
        </ControlGroup>
    );
}
