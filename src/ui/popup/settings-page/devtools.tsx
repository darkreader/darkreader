import {m} from 'malevic';
import ThemeEngines from '../../../generators/theme-engines';
import {getLocalMessage} from '../../../utils/locales';
import {Button} from '../../controls';
import ControlGroup from '../control-group';
import {ViewProps} from '../types';


function getExistingDevToolsWindowId() {
    return new Promise<number>((resolve => {
        chrome.windows.getAll({
            populate: true,
            windowTypes: ['popup']
        }, (w) => {
            for (const window of w) {
                if (window.tabs[0].url.endsWith('ui/devtools/index.html')) {
                    resolve(window.id);
                    return;
                }
            }
            resolve(-1);
        }
        );
    }));
}

function isDevToolsOpen() {
    return new Promise((resolve => {
        chrome.windows.getAll({
            populate: true,
            windowTypes: ['popup']
        }, (w) => {
            for (const window of w) {
                if (window.tabs[0].url.endsWith('ui/devtools/index.html')) {
                    resolve(true);
                    return;
                }
            }
            resolve(false);
        }
        ); }));
}


async function openDevTools() {
    const open = await isDevToolsOpen();
    if (!open) {
        chrome.windows.create({
            type: 'popup',
            url: 'ui/devtools/index.html',
            width: 600,
            height: 600,
        });
    } else {
        chrome.windows.update(await getExistingDevToolsWindowId(), {'focused': true});
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
