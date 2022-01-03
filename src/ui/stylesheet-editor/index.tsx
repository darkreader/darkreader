import {m} from 'malevic';
import {sync} from 'malevic/dom';
import Body from './components/body';
import Connector from '../connect/connector';
import type {ExtensionActions, ExtensionData, TabInfo} from '../../definitions';

function renderBody(data: ExtensionData, tab: TabInfo, actions: ExtensionActions) {
    sync(document.body, <Body data={data} tab={tab} actions={actions} />);
}

async function start() {
    const connector = new Connector();
    window.addEventListener('unload', () => connector.disconnect());

    const data = await connector.getData();
    const tab = await connector.getActiveTabInfo();
    renderBody(data, tab, connector);
    connector.subscribeToChanges((data) => renderBody(data, tab, connector));
}

start();
