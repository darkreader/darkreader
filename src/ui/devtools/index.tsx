import {m} from 'malevic';
import {sync} from 'malevic/dom';
import Body from './components/body';
import Connector from '../connect/connector';
import type {ExtensionData} from '../../definitions';

function renderBody(data: ExtensionData, actions: Connector) {
    sync(document.body, <Body data={data} actions={actions} />);
}

async function start() {
    const connector = new Connector();
    window.addEventListener('unload', () => connector.disconnect());

    const data = await connector.getData();
    renderBody(data, connector);
    connector.subscribeToChanges((data) => renderBody(data, connector));
}

start();

declare const __DEBUG__: boolean;
const DEBUG = __DEBUG__;
if (DEBUG) {
    const socket = new WebSocket(`ws://localhost:8894`);
    socket.onmessage = (e) => {
        const respond = (message: {type: string; id: number; data?: string}) => socket.send(JSON.stringify(message));
        const message: {type: string; id: number; data: string} = JSON.parse(e.data);
        try {
            const textarea: HTMLTextAreaElement = document.querySelector('textarea#editor');
            const [buttonReset, buttonApply] = document.querySelectorAll('button');
            switch (message.type) {
                case 'debug-devtools-paste':
                    textarea.value = message.data;
                    buttonApply.click();
                    respond({type: 'debug-devtools-paste-response', id: message.id});
                    break;
                case 'debug-devtools-reset':
                    respond({type: 'debug-devtools-reset-response', id: message.id});
                    buttonReset.click();
                    (document.querySelector('button.message-box__button-ok') as HTMLButtonElement).click();
                    break;
            }
        } catch (err) {
            respond({type: 'error', id: message.id, data: String(err)});
        }
    };
}
