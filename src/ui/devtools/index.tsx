import {m} from 'malevic';
import {sync} from 'malevic/dom';
import Body from './components/body';
import Connector from '../connect/connector';
import type {DevToolsData, ExtensionData} from '../../definitions';

declare const __CHROMIUM_MV3__: boolean;

function renderBody(data: ExtensionData, devToolsData: DevToolsData, actions: Connector) {
    sync(document.body, <Body data={data} devtools={devToolsData} actions={actions} />);
}

async function start() {
    const connector = new Connector();
    window.addEventListener('unload', () => connector.disconnect());

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

declare const __TEST__: boolean;
if (__TEST__) {
    const socket = new WebSocket(`ws://localhost:8894`);
    socket.onopen = async () => {
        socket.send(JSON.stringify({
            data: {
                type: 'devtools',
                uuid: `ready-${document.location.pathname}`,
            },
            id: null,
        }));
    };
    socket.onmessage = (e) => {
        const respond = (message: {id: number; data?: string; error?: string}) => socket.send(JSON.stringify(message));
        const message: {type: string; id: number; data: string} = JSON.parse(e.data);
        const {id, data} = message;
        try {
            const textarea: HTMLTextAreaElement = document.querySelector('textarea#editor')!;
            const [buttonReset, buttonApply] = document.querySelectorAll('button');
            switch (message.type) {
                case 'debug-devtools-paste':
                    textarea.value = data;
                    buttonApply.click();
                    respond({id});
                    break;
                case 'debug-devtools-reset':
                    respond({id});
                    buttonReset.click();
                    (document.querySelector('button.message-box__button-ok') as HTMLButtonElement).click();
                    break;
            }
        } catch (err) {
            respond({id, error: String(err)});
        }
    };
}

if (__CHROMIUM_MV3__) {
    // See getExtensionPageTabMV3() for explanation of what it is
    chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
        if (message === 'getExtensionPageTabMV3_ping') {
            sendResponse('getExtensionPageTabMV3_pong');
        }
    });
}
