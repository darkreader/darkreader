import {m} from 'malevic';
import {sync} from 'malevic/dom';

import type {ExtensionData, DebugMessageBGtoCS, DebugMessageBGtoUI} from '../../definitions';
import {DebugMessageTypeBGtoUI} from '../../utils/message';
import {isFirefox, isMobile} from '../../utils/platform';
import Connector from '../connect/connector';

import Body from './body/body';

declare const __CHROMIUM_MV3__: boolean;

function renderBody(data: ExtensionData, actions: Connector) {
    sync(document.body, <Body data={data} actions={actions} />);
}

async function start(): Promise<void> {
    const connector = new Connector();
    window.addEventListener('unload', () => connector.disconnect(), {passive: true});

    const data = await connector.getData();
    renderBody(data, connector);
    connector.subscribeToChanges(async (newData) => {
        renderBody(newData, connector);
    });
}

document.documentElement.classList.toggle('mobile', isMobile);
document.documentElement.classList.toggle('firefox', isFirefox);

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
