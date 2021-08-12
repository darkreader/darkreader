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
