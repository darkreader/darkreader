import {m} from 'malevic';
import {sync} from 'malevic/dom';
import Body from './components/body';
import connect from '../connect';
import type {ExtensionData, TabInfo} from '../../definitions';
import type Connector from '../connect/connector';

function renderBody(data: ExtensionData, tab: TabInfo, actions: Connector) {
    sync(document.body, <Body data={data} tab={tab} actions={actions} />);
}

async function start() {
    const connector = connect();
    window.addEventListener('unload', () => connector.disconnect());

    const data = await connector.getData();
    const tabInfo = await connector.getActiveTabInfo();
    renderBody(data, tabInfo, connector);
    connector.subscribeToChanges((data) => renderBody(data, tabInfo, connector));
}

start();

declare const __DEBUG__: boolean;
const DEBUG = __DEBUG__;
if (DEBUG) {
    const socket = new WebSocket(`ws://localhost:8894`);
    socket.onmessage = (e) => {
        const respond = (message: any) => socket.send(JSON.stringify(message));
        try {
            const message = JSON.parse(e.data);
            const textarea: HTMLTextAreaElement = document.querySelector('textarea#editor');
            const [buttonReset, buttonApply, buttonRedesign] = document.querySelectorAll('button');
            switch(message.type) {
                case 'debug-devtools-paste':
                    textarea.value = message.data;
                    buttonApply.click();
                    respond({type: 'debug-devtools-paste-response'});
                    break;
                case 'debug-devtools-reset':
                    respond({type: 'debug-devtools-reset-response'});
                    buttonReset.click();
                    (document.querySelector('button.message-box__button-ok') as HTMLButtonElement).click();
                    break;
            }
        } catch (err) {
            respond({type: 'error', data: String(err)});
        }
    };
}