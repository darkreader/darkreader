// @ts-check
import {sync} from 'malevic/dom';
import Body from './components/body';
import Connector from '../connect/connector';

/** @typedef {import('../../definitions').ExtensionData} ExtensionData */
/** @typedef {import('../../definitions').TabInfo} TabInfo */

/**
 * @param {ExtensionData} data
 * @param {TabInfo} tab
 * @param {Connector} actions
 */
function renderBody(data, tab, actions) {
    sync(document.body, Body({data, tab, actions}));
}

async function start() {
    const connector = new Connector();
    window.addEventListener('unload', () => connector.disconnect());

    const data = await connector.getData();
    const tabInfo = await connector.getActiveTabInfo();
    renderBody(data, tabInfo, connector);
    connector.subscribeToChanges((data) => renderBody(data, tabInfo, connector));
}

start();

if (__DEBUG__) {
    const socket = new WebSocket(`ws://localhost:8894`);
    socket.onmessage = (e) => {
        /** @type {(message: {type: string; id: number; data?: string}) => void} */
        const respond = (message) => socket.send(JSON.stringify(message));
        /** @type {{type: string; id: number; data: string}} */
        const message = JSON.parse(e.data);
        try {
            /** @type {HTMLTextAreaElement} */
            const textarea = document.querySelector('textarea#editor');
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
                    /** @type {HTMLButtonElement} */(document.querySelector('button.message-box__button-ok')).click();
                    break;
            }
        } catch (err) {
            respond({type: 'error', id: message.id, data: String(err)});
        }
    };
}
