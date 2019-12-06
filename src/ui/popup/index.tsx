import {m} from 'malevic';
import {sync} from 'malevic/dom';
import connect from '../connect';
import Body from './components/body';
import {isMobile, isFirefox} from '../../utils/platform';
import {popupHasBuiltInHorizontalBorders, popupHasBuiltInBorders, fixNotClosingPopupOnNavigation} from './utils/issues';
import {ExtensionData, ExtensionActions, TabInfo} from '../../definitions';

function renderBody(data: ExtensionData, tab: TabInfo, actions: ExtensionActions) {
    sync(document.body, (
        <Body data={data} tab={tab} actions={actions} />
    ));
}

async function start() {
    const connector = connect();
    window.addEventListener('unload', () => connector.disconnect());

    const [data, tab] = await Promise.all([
        connector.getData(),
        connector.getActiveTabInfo(),
    ]);
    renderBody(data, tab, connector);
    connector.subscribeToChanges((data) => renderBody(data, tab, connector));
}

start();

document.documentElement.classList.toggle('mobile', isMobile());
document.documentElement.classList.toggle('built-in-borders', popupHasBuiltInBorders());
document.documentElement.classList.toggle('built-in-horizontal-borders', popupHasBuiltInHorizontalBorders());

if (isFirefox()) {
    fixNotClosingPopupOnNavigation();
}

declare const __DEBUG__: boolean;
const DEBUG = __DEBUG__;
if (DEBUG) {
    chrome.runtime.onMessage.addListener(({type, data}) => {
        if (type === 'popup-stylesheet-update') {
            let style = document.getElementById('popup-stylesheet-update');
            if (!style) {
                style = document.createElement('style');
                document.head.appendChild(style);
            }
            (document.querySelector('link[rel="stylesheet"]') as HTMLLinkElement).disabled = true;
            style.textContent = data;
        }
    });
}
