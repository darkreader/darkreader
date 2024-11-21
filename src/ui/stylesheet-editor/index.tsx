import {m} from 'malevic';
import {sync} from 'malevic/dom';

import type {ExtensionActions, ExtensionData} from '../../definitions';
import Connector from '../connect/connector';

import Body from './components/body';

function renderBody(data: ExtensionData, actions: ExtensionActions) {
    sync(document.body, <Body data={data} actions={actions} />);
}

async function start() {
    const connector = new Connector();
    window.addEventListener('unload', () => connector.disconnect(), {passive: true});

    const data = await connector.getData();
    renderBody(data, connector);
    connector.subscribeToChanges((data) => renderBody(data, connector));
}

start();
