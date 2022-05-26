import {m} from 'malevic';
import {sync} from 'malevic/dom';
import Connector from '../connect/connector';
import Body from './components/body';
import {popupHasBuiltInHorizontalBorders, popupHasBuiltInBorders, fixNotClosingPopupOnNavigation} from './utils/issues';
import type {ExtensionData, ExtensionActions} from '../../definitions';
import {isMobile, isFirefox} from '../../utils/platform';
import {MessageType} from '../../utils/message';
import {getFontList} from '../utils';

function renderBody(data: ExtensionData, fonts: string[], actions: ExtensionActions) {
    if (data.settings.previewNewDesign) {
        if (!document.documentElement.classList.contains('preview')) {
            document.documentElement.classList.add('preview');
        }
    } else if (document.documentElement.classList.contains('preview')) {
        document.documentElement.classList.remove('preview');
    }

    if (data.news && data.news.length > 0) {
        const latest = data.news[0];
        if (latest && !latest.displayed) {
            actions.markNewsAsDisplayed([latest.id]);
        }
    }

    sync(document.body, (
        <Body data={data} actions={actions} fonts={fonts} />
    ));
}

async function start() {
    const connector = new Connector();
    window.addEventListener('unload', () => connector.disconnect());

    const [data, fonts] = await Promise.all([
        connector.getData(),
        getFontList()
    ]);
    renderBody(data, fonts, connector);
    connector.subscribeToChanges((data) => renderBody(data, fonts, connector));
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
        if (type === MessageType.BG_CSS_UPDATE) {
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

        if (type === MessageType.BG_UI_UPDATE) {
            location.reload();
        }
    });

    const socket = new WebSocket(`ws://localhost:8894`);
    socket.onmessage = (e) => {
        const respond = (message: {type: string; id?: number; data?: any}) => socket.send(JSON.stringify(message));
        try {
            const message: {type: string; id: number; data: string} = JSON.parse(e.data);
            if (message.type === 'click') {
                const selector = message.data;
                const element: HTMLElement = document.querySelector(selector);
                element.click();
                respond({type: 'click-response', id: message.id});
            } else if (message.type === 'exists') {
                const selector = message.data;
                const element = document.querySelector(selector);
                respond({type: 'exists-response', id: message.id, data: element != null});
            } else if (message.type === 'rect') {
                const selector = message.data;
                const element: HTMLElement = document.querySelector(selector);
                const rect = element.getBoundingClientRect();
                respond({type: 'rect-response', id: message.id, data: {left: rect.left, top: rect.top, width: rect.width, height: rect.height}});
            }
        } catch (err) {
            respond({type: 'error', data: String(err)});
        }
    };
}
