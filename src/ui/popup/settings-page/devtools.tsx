import {m} from 'malevic';
import ThemeEngines from '../../../generators/theme-engines';
import {getLocalMessage} from '../../../utils/locales';
import {NavButton} from '../../controls';
import ControlGroup from '../control-group';
import type {ViewProps} from '../types';
import {isMobile, isFirefox} from '../../../utils/platform';

function getExistingDevToolsObject(): Promise<chrome.windows.Window> | Promise<chrome.tabs.Tab> {
    if (isMobile) {
        return new Promise<chrome.tabs.Tab>((resolve) => {
            chrome.tabs.query({}, (t) => {
                for (const tab of t) {
                    if (tab.url.endsWith('ui/devtools/index.html')) {
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
    const devToolsObject = await getExistingDevToolsObject();
    if (isMobile) {
        if (devToolsObject) {
            chrome.tabs.update(devToolsObject.id, {'active': true});
            window.close();
        } else {
            chrome.tabs.create({
                url: '../devtools/index.html',
            });
            window.close();
        }
    } else if (devToolsObject) {
        chrome.windows.update(devToolsObject.id, {'focused': true});
    } else {
        chrome.windows.create({
            type: 'popup',
            url: isFirefox ? '../devtools/index.html' : 'ui/devtools/index.html',
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
                <NavButton
                    onClick={openDevTools}
                    class={{
                        'dev-tools-button': true,
                        'dev-tools-button--has-custom-fixes': hasCustomFixes,
                    }}
                >
                    🛠 {getLocalMessage('open_dev_tools')}
                </NavButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Make a fix for a website
            </ControlGroup.Description>
        </ControlGroup>
    );
}
