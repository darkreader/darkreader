import {m} from 'malevic';
import {sync} from 'malevic/dom';
import type {DevToolsData, ExtensionData, DebugMessageBGtoCS, DebugMessageBGtoUI} from '../../definitions';
import {DebugMessageTypeBGtoUI} from '../../utils/message';
import Body from './body/body';
import Connector from '../connect/connector';

declare const __CHROMIUM_MV3__: boolean;

function renderBody(data: ExtensionData, devToolsData: DevToolsData, actions: Connector) {
    sync(document.body, <Body data={data} devtools={devToolsData} actions={actions} />);
}

async function start(): Promise<void> {
    const connector = new Connector();
    window.addEventListener('unload', () => connector.disconnect(), {passive: true});

    let [data, devToolsData] = await Promise.all([
        connector.getData(),
        connector.getDevToolsData(),
    ]);
    renderBody(data, devToolsData, connector);
    connector.subscribeToChanges(async (data_) => {
        data = data_;
        devToolsData = await connector.getDevToolsData();
        renderBody(data, devToolsData, connector);
    });
}

start();

declare const __DEBUG__: boolean;
if (__DEBUG__) {
    chrome.runtime.onMessage.addListener(({type}: DebugMessageBGtoCS | DebugMessageBGtoUI) => {
        if (type === DebugMessageTypeBGtoUI.CSS_UPDATE) {
            document.querySelectorAll('link[rel="stylesheet"]').forEach((link: HTMLLinkElement) => {
                const url = link.href;
                link.disabled = true;
                const newLink = document.createElement('link');
                newLink.rel = 'stylesheet';
                newLink.href = url.replace(/\?.*$/, `?nocache=${Date.now()}`);
                link.parentElement!.insertBefore(newLink, link);
                link.remove();
            });
        }

        if (type === DebugMessageTypeBGtoUI.UPDATE) {
            location.reload();
        }
    });
}

if (__CHROMIUM_MV3__) {
    // See getExtensionPageTabMV3() for explanation of what it is
    chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
        if (message === 'getExtensionPageTabMV3_ping') {
            sendResponse('getExtensionPageTabMV3_pong');
        }
    });
}
