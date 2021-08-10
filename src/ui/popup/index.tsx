import {m} from 'malevic';
import {sync} from 'malevic/dom';
import connect from '../connect';
import Body from './components/body';
import {popupHasBuiltInHorizontalBorders, popupHasBuiltInBorders, fixNotClosingPopupOnNavigation} from './utils/issues';
import type {ExtensionData, ExtensionActions, TabInfo} from '../../definitions';
import {isMobile, isFirefox} from '../../utils/platform';

function renderBody(data: ExtensionData, tab: TabInfo, actions: ExtensionActions) {
    if (data.settings.previewNewDesign) {
        if (!document.documentElement.classList.contains('preview')) {
            document.documentElement.classList.add('preview');
        }
    } else if (document.documentElement.classList.contains('preview')) {
        document.documentElement.classList.remove('preview');
    }

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

addEventListener('load', start);

document.documentElement.classList.toggle('mobile', isMobile);
document.documentElement.classList.toggle('firefox', isFirefox);
document.documentElement.classList.toggle('built-in-borders', popupHasBuiltInBorders());
document.documentElement.classList.toggle('built-in-horizontal-borders', popupHasBuiltInHorizontalBorders());

if (isFirefox) {
    fixNotClosingPopupOnNavigation();
}

declare const __DEBUG__: boolean;
const DEBUG = __DEBUG__;
if (DEBUG) {
    chrome.runtime.onMessage.addListener(({type}) => {
        if (type === 'css-update') {
            document.querySelectorAll('link[rel="stylesheet"]').forEach((link: HTMLLinkElement) => {
                const url = link.href;
                link.disabled = true;
                const newLink = document.createElement('link');
                newLink.rel = 'stylesheet';
                newLink.href = url.replace(/\?.*$/, `?nocache=${Date.now()}`);
                link.parentElement.insertBefore(newLink, link);
                link.remove();
            });
        }

        if (type === 'ui-update') {
            location.reload();
        }
    });

    const socket = new WebSocket(`ws://localhost:8894`);
    socket.onmessage = (e) => {
        const respond = (message: any) => socket.send(JSON.stringify(message));
        try {
            const message = JSON.parse(e.data);
            if (message.type === 'click') {
                const selector = message.data;
                const element = document.querySelector(selector);
                element.click();
                respond({type: 'click-response'});
            } else if (message.type === 'exists') {
                const selector = message.data;
                const element = document.querySelector(selector);
                respond({type: 'exists-response', data: element != null});
            } else if (message.type === 'rect') {
                const selector = message.data;
                const element = document.querySelector(selector);
                const rect = (element as HTMLElement).getBoundingClientRect();
                respond({type: 'rect-response', data: {left: rect.left, top: rect.top, width: rect.width, height: rect.height}});
            }
        } catch (err) {
            respond({type: 'error', data: String(err)});
        }
    };
}
