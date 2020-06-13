import {m} from 'malevic';
import {sync} from 'malevic/dom';
import Body from './components/body';
import connect from '../connect';

function renderBody(data, tab, actions) {
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
